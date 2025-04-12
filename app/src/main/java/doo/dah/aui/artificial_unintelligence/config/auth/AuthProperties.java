package doo.dah.aui.artificial_unintelligence.config.auth;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "app.auth")
public class AuthProperties {
    private final String clientId;
    private final String scope;
}
