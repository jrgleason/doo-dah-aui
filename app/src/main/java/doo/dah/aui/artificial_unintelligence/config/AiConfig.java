package doo.dah.aui.artificial_unintelligence.config;

import doo.dah.aui.artificial_unintelligence.advisors.SQLStorageAdvisor;
import doo.dah.aui.artificial_unintelligence.repos.UserQuestionRepository;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.client.advisor.QuestionAnswerAdvisor;
import org.springframework.ai.chat.memory.InMemoryChatMemory;
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
    public MessageChatMemoryAdvisor messageChatMemoryAdvisor() {
        return new MessageChatMemoryAdvisor(new InMemoryChatMemory());
    }

    @Bean
    public ChatClient buildClient(
            ChatClient.Builder aiBuilder,
            MessageChatMemoryAdvisor messageChatMemoryAdvisor,
            VectorStore pineconeVectorStore,
            UserQuestionRepository userQuestionRepository
    ) {
        return aiBuilder
                .defaultAdvisors(
                        messageChatMemoryAdvisor,
                        new QuestionAnswerAdvisor(pineconeVectorStore),
                        new SQLStorageAdvisor(userQuestionRepository)
                )
                .defaultSystem(instructions)
                .defaultOptions(new OllamaOptions())
                .build();
    }
}