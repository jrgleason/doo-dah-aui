package doo.dah.aui.artificial_unintelligence.util;

/*
 * Copyright 2023-2024 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import com.knuddels.jtokkit.Encodings;
import com.knuddels.jtokkit.api.Encoding;
import com.knuddels.jtokkit.api.EncodingRegistry;
import com.knuddels.jtokkit.api.EncodingType;
import com.knuddels.jtokkit.api.IntArrayList;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.util.Assert;

import java.util.ArrayList;
import java.util.List;

/**
 * Extension of {@link TokenTextSplitter} that adds support for overlapping tokens
 * between chunks.
 *
 * @author [Your Name]
 */
public class OverlappingTokenTextSplitter extends TokenTextSplitter {

    private static final int DEFAULT_CHUNK_OVERLAY = 0;

    private final EncodingRegistry registry = Encodings.newLazyEncodingRegistry();
    private final Encoding encoding = this.registry.getEncoding(EncodingType.CL100K_BASE);

    // The number of tokens to overlay between chunks
    private final int chunkOverlay;

    // Needed to access the parent class settings
    private final int chunkSize;
    private final int minChunkSizeChars;
    private final int minChunkLengthToEmbed;
    private final int maxNumChunks;
    private final boolean keepSeparator;

    /**
     * Create an OverlappingTokenTextSplitter with default settings.
     */
    public OverlappingTokenTextSplitter() {
        this(DEFAULT_CHUNK_OVERLAY);
    }

    /**
     * Create an OverlappingTokenTextSplitter with specified overlay.
     *
     * @param chunkOverlay the number of tokens to overlap between chunks
     */
    public OverlappingTokenTextSplitter(int chunkOverlay) {
        super();
        this.chunkOverlay = chunkOverlay;
        this.chunkSize = 800; // Default values from parent class
        this.minChunkSizeChars = 350;
        this.minChunkLengthToEmbed = 5;
        this.maxNumChunks = 10000;
        this.keepSeparator = true;

        validateParameters();
    }

    /**
     * Creates an OverlappingTokenTextSplitter with custom settings.
     *
     * @param chunkSize             the target size of each text chunk in tokens
     * @param minChunkSizeChars     the minimum size of each text chunk in characters
     * @param minChunkLengthToEmbed discard chunks shorter than this
     * @param maxNumChunks          the maximum number of chunks to generate from a text
     * @param keepSeparator         whether to keep separators in the output chunks
     * @param chunkOverlay          the number of tokens to overlap between chunks
     */
    public OverlappingTokenTextSplitter(int chunkSize, int minChunkSizeChars, int minChunkLengthToEmbed,
                                        int maxNumChunks, boolean keepSeparator, int chunkOverlay) {
        super(chunkSize, minChunkSizeChars, minChunkLengthToEmbed, maxNumChunks, keepSeparator);
        this.chunkOverlay = chunkOverlay;
        this.chunkSize = chunkSize;
        this.minChunkSizeChars = minChunkSizeChars;
        this.minChunkLengthToEmbed = minChunkLengthToEmbed;
        this.maxNumChunks = maxNumChunks;
        this.keepSeparator = keepSeparator;

        validateParameters();
    }

    public static Builder overlappingBuilder() {
        return new Builder();
    }

    private void validateParameters() {
        if (chunkOverlay >= chunkSize) {
            throw new IllegalArgumentException("Chunk overlay must be smaller than chunk size");
        }
    }

    @Override
    protected List<String> splitText(String text) {
        if (text == null || text.trim().isEmpty()) {
            return new ArrayList<>();
        }

        List<Integer> tokens = getEncodedTokens(text);
        List<String> chunks = new ArrayList<>();
        int num_chunks = 0;
        int tokenPosition = 0;

        while (tokenPosition < tokens.size() && num_chunks < this.maxNumChunks) {
            // Calculate the current chunk size (not exceeding token list size)
            int currentChunkSize = Math.min(chunkSize, tokens.size() - tokenPosition);

            // Get the tokens for this chunk
            List<Integer> chunk = tokens.subList(tokenPosition, tokenPosition + currentChunkSize);
            String chunkText = decodeTokens(chunk);

            // Skip the chunk if it is empty or whitespace
            if (chunkText.trim().isEmpty()) {
                tokenPosition += currentChunkSize;
                continue;
            }

            // Find the last period or punctuation mark in the chunk
            int lastPunctuation = Math.max(chunkText.lastIndexOf('.'), Math.max(chunkText.lastIndexOf('?'),
                    Math.max(chunkText.lastIndexOf('!'), chunkText.lastIndexOf('\n'))));

            if (lastPunctuation != -1 && lastPunctuation > this.minChunkSizeChars) {
                // Truncate the chunk text at the punctuation mark
                chunkText = chunkText.substring(0, lastPunctuation + 1);
            }

            String chunkTextToAppend = (this.keepSeparator) ? chunkText.trim()
                    : chunkText.replace(System.lineSeparator(), " ").trim();
            if (chunkTextToAppend.length() > this.minChunkLengthToEmbed) {
                chunks.add(chunkTextToAppend);
            }

            // Calculate how many tokens to move forward (considering overlay)
            int encodedChunkLength = getEncodedTokens(chunkText).size();
            int tokensToAdvance = Math.max(encodedChunkLength - chunkOverlay, 1);  // Ensure we move at least 1 token

            // Move forward by the calculated tokens, ensuring we don't get stuck
            tokenPosition += tokensToAdvance;

            num_chunks++;
        }

        // Handle the remaining tokens if there's a non-empty remainder, and we haven't hit max chunks

        return chunks;
    }

    private List<Integer> getEncodedTokens(String text) {
        Assert.notNull(text, "Text must not be null");
        return this.encoding.encode(text).boxed();
    }

    private String decodeTokens(List<Integer> tokens) {
        Assert.notNull(tokens, "Tokens must not be null");
        var tokensIntArray = new IntArrayList(tokens.size());
        tokens.forEach(tokensIntArray::add);
        return this.encoding.decode(tokensIntArray);
    }

    /**
     * Builder for OverlappingTokenTextSplitter.
     */
    public static final class Builder {
        private int chunkSize = 800;
        private int minChunkSizeChars = 350;
        private int minChunkLengthToEmbed = 5;
        private int maxNumChunks = 10000;
        private boolean keepSeparator = true;
        private int chunkOverlay = DEFAULT_CHUNK_OVERLAY;

        private Builder() {
        }

        public Builder withChunkSize(int chunkSize) {
            this.chunkSize = chunkSize;
            return this;
        }

        public Builder withMinChunkSizeChars(int minChunkSizeChars) {
            this.minChunkSizeChars = minChunkSizeChars;
            return this;
        }

        public Builder withMinChunkLengthToEmbed(int minChunkLengthToEmbed) {
            this.minChunkLengthToEmbed = minChunkLengthToEmbed;
            return this;
        }

        public Builder withMaxNumChunks(int maxNumChunks) {
            this.maxNumChunks = maxNumChunks;
            return this;
        }

        public Builder withKeepSeparator(boolean keepSeparator) {
            this.keepSeparator = keepSeparator;
            return this;
        }

        public Builder withChunkOverlay(int chunkOverlay) {
            this.chunkOverlay = chunkOverlay;
            return this;
        }

        public OverlappingTokenTextSplitter build() {
            return new OverlappingTokenTextSplitter(this.chunkSize, this.minChunkSizeChars,
                    this.minChunkLengthToEmbed, this.maxNumChunks, this.keepSeparator, this.chunkOverlay);
        }
    }
}