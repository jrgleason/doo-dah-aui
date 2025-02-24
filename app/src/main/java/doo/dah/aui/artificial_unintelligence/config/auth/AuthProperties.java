package doo.dah.aui.artificial_unintelligence.config.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.auth")
public class AuthProperties {
    private final String clientId;
    private final String scope;

    public AuthProperties(String clientId, String scope) {
        this.clientId = clientId;
        this.scope = scope;
    }

    public String getClientId() {
        return clientId;
    }

    public String getScope() {
        return scope;
    }
}
