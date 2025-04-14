package doo.dah.aui.artificial_unintelligence.controller;

import doo.dah.aui.artificial_unintelligence.config.auth.AuthPropertiesProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.Map;

@Controller
@RequestMapping("/config")
@RequiredArgsConstructor
public class ConfigController {
    private final AuthPropertiesProvider provider;

    @GetMapping(value = "/global", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseBody
    public Map<String, String> general() {
        return provider.getAuthProperties();
    }
}
