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
    @GetMapping("/protected")
    @ResponseBody
    public String protectedMeth() {
        return "Super Secret";
    }
    @GetMapping("/admin")
    @ResponseBody
    public String admin() {
        return "Yup you are an admin";
    }
}
