package doo.dah.aui.artificial_unintelligence.controller;

import com.google.gson.Gson;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("pinecone")
@RequiredArgsConstructor
public class PinconeController {
    private final VectorStore vectorStore;
    private final RestTemplate restTemplate;

    private static final int CHUNK_SIZE = 500;

    /**
     * Safely estimate token count from text, handling potentially very large content
     */
    private long estimateTokenCount(String text) {
        if (text == null) return 0L;

        // Use long to prevent integer overflow
        long charCount = (long) text.length();

        // Rough estimation: ~4 chars per token for English text
        return charCount / 4L;
    }

    /**
     * Split processed content into smaller chunks suitable for vector storage
     * @param content The processed content to split
     * @param metadata The metadata to include with each chunk
     * @return List of Document objects ready for vector store
     */
    public List<Document> chunkContent(String content, Map<String, Object> metadata) {
        List<Document> chunks = new ArrayList<>();

        // If content is small enough, no need to chunk
        if (content.length() <= CHUNK_SIZE) {
            Document doc = new Document(content);
            doc.getMetadata().putAll(metadata);
            doc.getMetadata().put("chunk", 1);
            doc.getMetadata().put("totalChunks", 1);
            chunks.add(doc);
            return chunks;
        }

        // Split content into paragraphs
        String[] paragraphs = content.split("\n\n");

        StringBuilder currentChunk = new StringBuilder();
        int chunkIndex = 1;

        for (String paragraph : paragraphs) {
            // If adding this paragraph would exceed chunk size, create a new chunk
            if (currentChunk.length() + paragraph.length() > CHUNK_SIZE && currentChunk.length() > 0) {
                // Create document from current chunk
                Document doc = new Document(currentChunk.toString());
                doc.getMetadata().putAll(metadata);
                doc.getMetadata().put("chunk", chunkIndex);
                chunks.add(doc);

                // Reset for next chunk
                currentChunk = new StringBuilder();
                chunkIndex++;
            }

            currentChunk.append(paragraph).append("\n\n");
        }

        // Add the last chunk if not empty
        if (currentChunk.length() > 0) {
            Document doc = new Document(currentChunk.toString());
            doc.getMetadata().putAll(metadata);
            doc.getMetadata().put("chunk", chunkIndex);
            chunks.add(doc);
        }

        // Set total chunks count in all documents
        for (Document doc : chunks) {
            doc.getMetadata().put("totalChunks", chunks.size());
        }

        return chunks;
    }

    /**
     * Extract title from HTML content
     */
    private static String extractTitle(String htmlContent) {
        Pattern titlePattern = Pattern.compile("<title[^>]*>(.*?)</title>", Pattern.DOTALL | Pattern.CASE_INSENSITIVE);
        Matcher matcher = titlePattern.matcher(htmlContent);
        return matcher.find() ? matcher.group(1).trim() : "";
    }

    /**
     * Remove specific HTML elements (including their content)
     */
    private static String removeHtmlElements(String html, String tagPattern) {
        Pattern pattern = Pattern.compile("<(" + tagPattern + ")[^>]*>[\\s\\S]*?</\\1>", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(html);
        return matcher.replaceAll("");
    }

    @PostMapping("add")
    public ResponseEntity<Void> addDocument(@RequestBody Map<String, Object> payload) {
        Gson gson = new Gson();
        String content = gson.toJson(payload);
        Document doc = new Document(content);
        vectorStore.add(List.of(doc));
        return ResponseEntity.ok().build();
    }

    @PostMapping("add-from-url")
    public ResponseEntity<Map<String, Object>> addDocumentFromUrl(@RequestBody Map<String, Object> payload) {
        try {
            String url = (String) payload.get("url");
            if (url == null || url.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "URL is required"));
            }

            // Download content from the URL
            String rawContent = restTemplate.getForObject(url, String.class);
            if (rawContent == null || rawContent.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Could not retrieve content from URL"));
            }

            // Log the raw content size
            long rawTokenEstimate = estimateTokenCount(rawContent);
            log.info("Downloaded content from URL: {} with estimated {} tokens", url, rawTokenEstimate);

            // Process the HTML content to reduce tokens
            org.jsoup.nodes.Document doc = Jsoup.parse(rawContent);

            // Extract just the text
            String processedContent = doc.text();
            log.info("Extracted text from HTML content with\n {}", processedContent);
            long processedTokenEstimate = estimateTokenCount(processedContent);

            log.info("Processed content from URL: {} - Raw tokens: {}, Processed tokens: {}, Reduction: {}%",
                    url, rawTokenEstimate, processedTokenEstimate,
                    Math.round((1 - (double)processedTokenEstimate/rawTokenEstimate) * 100));

            // Prepare metadata for chunks
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("source", url);

            // Add other metadata if provided
            if (payload.containsKey("title")) {
                metadata.put("title", payload.get("title"));
            }
            if (payload.containsKey("tags") && payload.get("tags") instanceof List) {
                metadata.put("tags", payload.get("tags"));
            }

            // Chunk the content and create documents
            List<Document> chunks = chunkContent(processedContent, metadata);
            log.info("Created {} chunks from content", chunks.size());

            try {
                // Add all chunks to vector store
                vectorStore.add(chunks);
                log.info("Successfully added {} document chunks from URL: {}", chunks.size(), url);

                // Return the first document's ID for reference
                String firstId = chunks.isEmpty() ? "" : chunks.get(0).getId();

                return ResponseEntity.ok(Map.of(
                        "id", firstId,
                        "message", String.format("Document successfully added from URL in %d chunks", chunks.size()),
                        "tokenCount", String.valueOf(processedTokenEstimate),
                        "chunks", chunks.size()
                ));
            } catch (Exception e) {
                log.error("Failed to add document chunks to vector store. Error: {}", e.getMessage());
                return ResponseEntity.internalServerError().body(Map.of(
                        "error", "Failed to add chunks: " + e.getMessage(),
                        "tokenCount", String.valueOf(processedTokenEstimate)
                ));
            }
        } catch (Exception e) {
            log.error("Error processing URL: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("search")
    public List<Map<String, Object>> searchDocuments() {
        // Retrieve documents similar to a query
        List<Document> results = this.vectorStore.similaritySearch(SearchRequest.builder().query("Smart Home").topK(5).build());
        return Objects.requireNonNull(results).stream().map(doc -> Map.of(
                "id", doc.getId(), // Include the id property
                "content", Objects.requireNonNull(doc.getText()),
                "metadata", doc.getMetadata()
        )).collect(Collectors.toList());
    }

    @DeleteMapping("delete")
    public ResponseEntity<Void> deleteDocument(@RequestParam String id) {
        // Implement the logic to delete a document by its ID
        vectorStore.delete(Collections.singletonList(id));
        return ResponseEntity.noContent().build();
    }
}
