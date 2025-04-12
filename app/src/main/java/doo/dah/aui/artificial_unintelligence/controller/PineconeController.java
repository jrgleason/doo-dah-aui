package doo.dah.aui.artificial_unintelligence.controller;

import doo.dah.aui.artificial_unintelligence.service.DocumentProcessingService;
import doo.dah.aui.artificial_unintelligence.service.WebCrawlerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("pinecone")
@RequiredArgsConstructor
public class PineconeController {
    private final VectorStore vectorStore;
    private final RestTemplate restTemplate;
    private final DocumentProcessingService documentProcessingService;
    private final WebCrawlerService siteCrawlerService;

    private static String getType(String contentType, String fileName) {
        if (contentType != null) {
            switch (contentType) {
                case "application/pdf" -> {
                    return "pdf";
                }
                case "application/msword" -> {
                    return "doc";
                }
                case "application/vnd.openxmlformats-officedocument.wordprocessingml.document" -> {
                    return "docx";
                }
            }
        }
        if (fileName.endsWith(".doc")) return "doc";
        if (fileName.endsWith(".docx")) return "docx";
        return "txt";
    }

    private DocumentProcessingService.ProcessingConfig createConfig(Integer chunkSize, Integer minSize,
                                                                    Integer minLength, Integer maxChunks, Boolean keepSeparator, Integer overlay) {
        return new DocumentProcessingService.ProcessingConfig(
                chunkSize != null ? chunkSize : 800,
                minSize != null ? minSize : 350,
                minLength != null ? minLength : 5,
                maxChunks != null ? maxChunks : 10000,
                keepSeparator != null ? keepSeparator : true,
                overlay != null ? overlay : 100
        );
    }

    @PostMapping(value = "add/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('SCOPE_add:documents')")
    public ResponseEntity<Map<String, Object>> addFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Integer defaultChunkSize,
            @RequestParam(required = false) Integer minChunkSizeChars,
            @RequestParam(required = false) Integer minChunkLengthToEmbed,
            @RequestParam(required = false) Integer maxNumChunks,
            @RequestParam(required = false) Boolean keepSeparator,
            @RequestParam(required = false) Integer chunkOverlay) {

        try {
            Map<String, Object> metadata = Map.of(
                    "name", Objects.requireNonNull(file.getOriginalFilename()),
                    "type", Objects.requireNonNull(file.getContentType()),
                    "size", file.getSize(),
                    "uploadDate", System.currentTimeMillis()
            );

            String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
            String type = getType(file.getContentType(), fileName);

            DocumentProcessingService.ProcessingConfig config = createConfig(defaultChunkSize, minChunkSizeChars,
                    minChunkLengthToEmbed, maxNumChunks, keepSeparator, chunkOverlay);

            int chunkCount = documentProcessingService.processFileWithConfig(file.getBytes(), metadata, type, config);

            return ResponseEntity.ok(Map.of("message", "File processed and added to vector store", "chunks", chunkCount));
        } catch (IOException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to read file: " + e.getMessage()));
        }
    }

    @PostMapping("add")
    @PreAuthorize("hasAuthority('SCOPE_add:documents')")
    public ResponseEntity<Map<String, Object>> addDirectContent(@RequestBody Map<String, Object> payload) {
        try {
            String title = (String) payload.get("title");
            String content = (String) payload.get("content");
            List<String> tags = (List<String>) payload.get("tags");

            Map<String, Object> metadata = new HashMap<>();
            metadata.put("title", title);
            metadata.put("source", "direct");
            if (tags != null && !tags.isEmpty()) {
                metadata.put("tags", tags);
            }

            DocumentProcessingService.ProcessingConfig config = createConfig(800, 350, 5, 10000, true, 100);
            int result = documentProcessingService.processDocumentWithConfig(content, metadata, config);
            return ResponseEntity.ok(Map.of("message", "Content successfully added to knowledge base", "chunks", result));
        } catch (Exception e) {
            log.error("Error processing direct content: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("add-from-url")
    @PreAuthorize("hasAuthority('SCOPE_add:documents')")
    public ResponseEntity<Map<String, Object>> addDocumentFromUrl(@RequestBody Map<String, Object> payload) {
        try {
            String url = (String) payload.get("url");
            if (url == null || url.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "URL is required"));
            }

            String title = (String) payload.get("title");
            List<String> tags = (List<String>) payload.get("tags");
            Boolean crawlEntireSite = (Boolean) payload.get("crawlEntireSite");
            Integer crawlDepth = (Integer) payload.get("crawlDepth");

            if (Boolean.TRUE.equals(crawlEntireSite)) {
                siteCrawlerService.crawlSite(url, crawlDepth != null ? crawlDepth : 3, title, tags);
                return ResponseEntity.accepted().body(Map.of(
                        "message", "Site crawl started. Content will be processed in the background.",
                        "url", url,
                        "crawlDepth", crawlDepth != null ? crawlDepth : 3
                ));
            }

            String rawContent = restTemplate.getForObject(url, String.class);
            if (rawContent == null || rawContent.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Could not retrieve content from URL"));
            }

            String processedContent = Jsoup.parse(rawContent).text();

            Map<String, Object> metadata = new HashMap<>();
            metadata.put("source", url);
            if (title != null && !title.isEmpty()) metadata.put("title", title);
            if (tags != null && !tags.isEmpty()) metadata.put("tags", tags);

            int chunks = documentProcessingService.processDocument(processedContent, metadata);
            return ResponseEntity.ok(Map.of(
                    "message", String.format("Document successfully added from URL in %d chunks", chunks),
                    "chunks", chunks
            ));
        } catch (Exception e) {
            log.error("Error processing URL: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("search")
    public List<Map<String, Object>> searchDocuments() {
        List<Document> results = this.vectorStore.similaritySearch(SearchRequest.builder().query("Smart Home").topK(5).build());
        return Objects.requireNonNull(results).stream()
                .map(doc -> Map.of(
                        "id", doc.getId(),
                        "content", Objects.requireNonNull(doc.getText()),
                        "metadata", doc.getMetadata()
                ))
                .collect(Collectors.toList());
    }

    @DeleteMapping("delete")
    public ResponseEntity<Void> deleteDocument(@RequestParam String id) {
        vectorStore.delete(Collections.singletonList(id));
        return ResponseEntity.noContent().build();
    }
}