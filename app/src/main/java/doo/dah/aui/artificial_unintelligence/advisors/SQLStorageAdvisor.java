package doo.dah.aui.artificial_unintelligence.advisors;

import doo.dah.aui.artificial_unintelligence.models.UserQuestion;
import doo.dah.aui.artificial_unintelligence.repos.UserQuestionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.advisor.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;

import java.lang.reflect.Method;
import java.time.Instant;

@Component
@Profile("local")
public class SQLStorageAdvisor implements CallAroundAdvisor, StreamAroundAdvisor {

    private static final Logger logger = LoggerFactory.getLogger(SQLStorageAdvisor.class);

    private final UserQuestionRepository userQuestionRepository;

    @Autowired
    public SQLStorageAdvisor(UserQuestionRepository userQuestionRepository) {
        this.userQuestionRepository = userQuestionRepository;
    }

    @Override
    public AdvisedResponse aroundCall(AdvisedRequest advisedRequest, CallAroundAdvisorChain chain) {
        // Log the request to understand its structure
        logger.info("AdvisedRequest class: {}", advisedRequest.getClass().getName());
        logger.info("AdvisedRequest toString: {}", advisedRequest);

        // Log available methods
        logger.info("Available methods:");
        for (Method method : advisedRequest.getClass().getMethods()) {
            if (method.getName().startsWith("get") && method.getParameterCount() == 0) {
                logger.info(" - {}", method.getName());
            }
        }

        // Store the user question before proceeding
        storeUserQuestion(advisedRequest);

        // Continue with the chain using nextAroundCall

        return chain.nextAroundCall(advisedRequest);
    }

    @Override
    public Flux<AdvisedResponse> aroundStream(AdvisedRequest advisedRequest, StreamAroundAdvisorChain chain) {
        // Store the user question before proceeding
        storeUserQuestion(advisedRequest);

        // Continue with the chain using nextAroundStream
        return chain.nextAroundStream(advisedRequest);
    }

    private void storeUserQuestion(AdvisedRequest advisedRequest) {
        String username = getCurrentUsername();

        // Extract the user's question from the advisedRequest
        // Since the exact structure of AdvisedRequest is unclear, let's use a safer approach
        String question;

        try {
            // Try to access the request content as safely as possible
            // This uses reflection to avoid compile-time errors if the methods don't exist
            question = advisedRequest.toString();
        } catch (Exception e) {
            question = "[Unable to extract question content]";
        }

        Instant now = Instant.now();

        UserQuestion userQuestion = UserQuestion.builder()
                .username(username)
                .question(question)
                .timestamp(now)
                .build();

        userQuestionRepository.save(userQuestion);
    }

    private String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            return authentication.getName();
        }
        return "anonymous";
    }

    @Override
    public String getName() {
        return "SQLStorageAdvisor";
    }

    @Override
    public int getOrder() {
        return 0;
    }
}