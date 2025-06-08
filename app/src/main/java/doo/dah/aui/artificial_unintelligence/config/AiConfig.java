package doo.dah.aui.artificial_unintelligence.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.ollama.api.OllamaOptions;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AiConfig {

    @Value("${app.bot.instructions}")
    protected String instructions;

    @Bean
    public MessageChatMemoryAdvisor messageChatMemoryAdvisor(ChatMemory chatMemory) {
        return MessageChatMemoryAdvisor.builder(chatMemory).build();
    }    @Bean
    public ChatClient buildClient(
            ChatClient.Builder aiBuilder,
            MessageChatMemoryAdvisor messageChatMemoryAdvisor,
            VectorStore pineconeVectorStore
    ) {
        return aiBuilder
                .defaultAdvisors(messageChatMemoryAdvisor)
                .defaultSystem(instructions)
                .defaultOptions(new OllamaOptions())
                .build();
    }
}