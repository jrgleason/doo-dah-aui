package doo.dah.aui.artificial_unintelligence.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.client.advisor.QuestionAnswerAdvisor;
import org.springframework.ai.chat.memory.InMemoryChatMemory;
import org.springframework.ai.openai.OpenAiChatOptions;
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

    @Bean(name = "openAiBuildClient")
    public ChatClient buildClient(
            ChatClient.Builder openAiBuilder,
            MessageChatMemoryAdvisor messageChatMemoryAdvisor,
            VectorStore pineconeVectorStore
    ) {
        return openAiBuilder
                .defaultAdvisors(
                        messageChatMemoryAdvisor,
                        new QuestionAnswerAdvisor(pineconeVectorStore)
                )
                .defaultSystem(instructions)
                .defaultOptions(new OpenAiChatOptions())
                .build();
    }

//    @Bean // function description
//    @Description("Turn on/off or check the status, by not providing a value, of any device ")
//    public Function<
//           .  ToggleFunction.Request,
//            ToggleFunction.Response
//            > toggleDevice() {
//        return new ToggleFunction(deviceStateService);
//    }
}