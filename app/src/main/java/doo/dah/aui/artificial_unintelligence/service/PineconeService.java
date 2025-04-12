package doo.dah.aui.artificial_unintelligence.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PineconeService {
    private static final int CHUNK_SIZE = 500;
    private final VectorStore vectorStore;
    private final RestTemplate restTemplate;
    private final DocumentProcessingService documentProcessingService;

    /**
     * Safely estimate token count from text, handling potentially very large content
     */
    public long estimateTokenCount(String text) {
        if (text == null) return 0L;

        // Use long to prevent integer overflow
        long charCount = (long) text.length();

        // Rough estimation: ~4 chars per token for English text
        return charCount / 4L;
    }

    /**
     * Split processed content into smaller chunks suitable for vector storage
     *
     * @param content  The processed content to split
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
    public String extractTitle(String htmlContent) {
        Pattern titlePattern = Pattern.compile("<title[^>]*>(.*?)</title>", Pattern.DOTALL | Pattern.CASE_INSENSITIVE);
        Matcher matcher = titlePattern.matcher(htmlContent);
        return matcher.find() ? matcher.group(1).trim() : "";
    }

    /**
     * Remove specific HTML elements (including their content)
     */
    public String removeHtmlElements(String html, String tagPattern) {
        Pattern pattern = Pattern.compile("<(" + tagPattern + ")[^>]*>[\\s\\S]*?</\\1>", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(html);
        return matcher.replaceAll("");
    }

    /**
     * Process content from a URL and add to vector store
     */
    public Map<String, Object> processUrlContent(String url, String title, List<String> tags) {
        try {
            // Download content from the URL
            String rawContent = restTemplate.getForObject(url, String.class);
            if (rawContent == null || rawContent.isEmpty()) {
                throw new IllegalArgumentException("Could not retrieve content from URL");
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
                    Math.round((1 - (double) processedTokenEstimate / rawTokenEstimate) * 100));

            // Prepare metadata for chunks
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("source", url);

            // Add other metadata if provided
            if (title != null && !title.isEmpty()) {
                metadata.put("title", title);
            } else {
                // Try to extract title from content
                String extractedTitle = doc.title();
                if (!extractedTitle.isEmpty()) {
                    metadata.put("title", extractedTitle);
                }
            }

            if (tags != null && !tags.isEmpty()) {
                metadata.put("tags", tags);
            }

            // Chunk the content and create documents
            List<Document> chunks = chunkContent(processedContent, metadata);
            log.info("Created {} chunks from content", chunks.size());

            // Add all chunks to vector store
            vectorStore.add(chunks);
            log.info("Successfully added {} document chunks from URL: {}", chunks.size(), url);

            // Return the first document's ID for reference
            String firstId = chunks.isEmpty() ? "" : chunks.get(0).getId();

            return Map.of(
                    "id", firstId,
                    "message", String.format("Document successfully added from URL in %d chunks", chunks.size()),
                    "tokenCount", String.valueOf(processedTokenEstimate),
                    "chunks", chunks.size()
            );

        } catch (Exception e) {
            log.error("Error processing URL: {}", e.getMessage());
            throw new RuntimeException("Failed to process URL: " + e.getMessage(), e);
        }
    }

    /**
     * Process direct content and add to vector store
     */
    public Map<String, Object> processDirectContent(String title, String content, List<String> tags) {
        try {
            // Prepare metadata
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("title", title);
            metadata.put("source", "direct_submission");
            metadata.put("submissionDate", System.currentTimeMillis());

            if (tags != null && !tags.isEmpty()) {
                metadata.put("tags", tags);
            }

            // Estimate token count
            long tokenEstimate = estimateTokenCount(content);
            log.info("Processing direct content with title '{}' and estimated {} tokens", title, tokenEstimate);

            // Process the content through the document processing service
            int chunkCount = documentProcessingService.processDocument(
                    content,
                    metadata
            );

            log.info("Successfully processed direct content with title '{}' into {} chunks", title, chunkCount);

            return Map.of(
                    "message", String.format("Content successfully added in %d chunks", chunkCount),
                    "tokenCount", String.valueOf(tokenEstimate),
                    "chunks", chunkCount
            );

        } catch (Exception e) {
            log.error("Error processing direct content: {}", e.getMessage());
            throw new RuntimeException("Failed to process content: " + e.getMessage(), e);
        }
    }

    /**
     * Search for documents in the vector store
     */
    public List<Map<String, Object>> searchDocuments(String query, int topK) {
        List<Document> results = this.vectorStore.similaritySearch(
                SearchRequest.builder()
                        .query(query)
                        .topK(topK)
                        .build()
        );

        return Objects.requireNonNull(results).stream().map(doc -> {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("id", doc.getId());
            resultMap.put("content", Objects.requireNonNull(doc.getText()));
            resultMap.put("metadata", doc.getMetadata());
            return resultMap;
        }).collect(Collectors.toList());
    }

    /**
     * Delete a document from the vector store
     */
    public void deleteDocument(String id) {
        vectorStore.delete(Collections.singletonList(id));
    }
}