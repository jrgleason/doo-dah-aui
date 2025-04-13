package doo.dah.aui.artificial_unintelligence.controller;

import doo.dah.aui.artificial_unintelligence.service.ChatService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    //    @PostMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PostMapping
    public Flux<String> question(@RequestBody String question) {
        return chatService.streamResponse(question);
    }
}