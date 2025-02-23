package doo.dah.aui.artificial_unintelligence.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
@RequestMapping("/root")
public class RootController {
    @GetMapping
    @ResponseBody
    public String root() {
        return "Root";
    }
}
