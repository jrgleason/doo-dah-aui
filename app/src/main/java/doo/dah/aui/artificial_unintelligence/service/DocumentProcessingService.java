package doo.dah.aui.artificial_unintelligence.service;

import doo.dah.aui.artificial_unintelligence.util.OverlappingTokenTextSplitter;
import org.apache.tika.Tika;
import org.apache.tika.exception.TikaException;
import org.apache.tika.metadata.Metadata;
import org.apache.tika.parser.AutoDetectParser;
import org.apache.tika.parser.ParseContext;
import org.apache.tika.sax.BodyContentHandler;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;
import org.xml.sax.SAXException;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.List;
import java.util.Map;

@Service
public class DocumentProcessingService {
    private final VectorStore vectorStore;
    private final Tika tika;
    private final OverlappingTokenTextSplitter defaultSplitter;

    public DocumentProcessingService(VectorStore vectorStore) {
        this.vectorStore = vectorStore;
        this.tika = new Tika();
        this.defaultSplitter = createSplitter(new ProcessingConfig());
    }

    // Create splitter from config
    private OverlappingTokenTextSplitter createSplitter(ProcessingConfig config) {
        return OverlappingTokenTextSplitter.overlappingBuilder()
                .withChunkSize(config.chunkSize)
                .withMinChunkSizeChars(config.minChunkSizeChars)
                .withMinChunkLengthToEmbed(config.minChunkLengthToEmbed)
                .withMaxNumChunks(config.maxNumChunks)
                .withKeepSeparator(config.keepSeparator)
                .withChunkOverlay(config.chunkOverlay)
                .build();
    }

    // Process text content with default settings
    public int processDocument(String content, Map<String, Object> metadata) {
        return processDocumentWithConfig(content, metadata, new ProcessingConfig());
    }

    // Process text with custom config
    public int processDocumentWithConfig(String content, Map<String, Object> metadata, ProcessingConfig config) {
        Document document = new Document(content, metadata);
        List<Document> documents = createSplitter(config).split(List.of(document));
        vectorStore.add(documents);
        return documents.size();
    }

    // Process binary documents (PDF, Word, generic)
    public int processFile(byte[] content, Map<String, Object> metadata, String fileType) throws IOException {
        String text = extractText(content, fileType);
        return processDocument(text, metadata);
    }

    // Process binary documents with custom config
    public int processFileWithConfig(byte[] content, Map<String, Object> metadata,
                                     String fileType, ProcessingConfig config) throws IOException {
        String text = extractText(content, fileType);
        return processDocumentWithConfig(text, metadata, config);
    }

    // Extract text based on file type
    private String extractText(byte[] content, String fileType) throws IOException {
        switch (fileType.toLowerCase()) {
            case "pdf":
                return extractTextWithTika(content, "Failed to extract text from PDF");
            case "doc":
            case "docx":
                return extractTextWithTika(content, "Failed to extract text from Word document");
            default:
                return extractTextGeneric(content);
        }
    }

    private String extractTextWithTika(byte[] content, String errorMessage) throws IOException {
        try {
            AutoDetectParser parser = new AutoDetectParser();
            BodyContentHandler handler = new BodyContentHandler();
            Metadata metadata = new Metadata();
            ParseContext context = new ParseContext();
            parser.parse(new ByteArrayInputStream(content), handler, metadata, context);
            return handler.toString();
        } catch (SAXException | TikaException e) {
            throw new IOException(errorMessage, e);
        }
    }

    private String extractTextGeneric(byte[] content) throws IOException {
        try {
            return tika.parseToString(new ByteArrayInputStream(content));
        } catch (TikaException e) {
            throw new IOException("Failed to extract text from document", e);
        }
    }

    // Configuration class for document processing settings
    public static class ProcessingConfig {
        final int chunkSize;
        final int minChunkSizeChars;
        final int minChunkLengthToEmbed;
        final int maxNumChunks;
        final boolean keepSeparator;
        final int chunkOverlay;

        // Default constructor
        public ProcessingConfig() {
            this(1000, 350, 5, 10000, true, 5);
        }

        // Full constructor
        public ProcessingConfig(int chunkSize, int minChunkSizeChars, int minChunkLengthToEmbed,
                                int maxNumChunks, boolean keepSeparator, int chunkOverlay) {
            this.chunkSize = chunkSize;
            this.minChunkSizeChars = minChunkSizeChars;
            this.minChunkLengthToEmbed = minChunkLengthToEmbed;
            this.maxNumChunks = maxNumChunks;
            this.keepSeparator = keepSeparator;
            this.chunkOverlay = chunkOverlay;
        }
    }
}