package doo.dah.aui.artificial_unintelligence.config.auth;

import org.springframework.boot.autoconfigure.security.oauth2.resource.OAuth2ResourceServerProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Configuration
@EnableConfigurationProperties(AuthProperties.class)
public class AuthConfig {
    private final OAuth2ResourceServerProperties oauth2Props;
    private final AuthProperties authProperties;

    public AuthConfig(OAuth2ResourceServerProperties oauth2Props, AuthProperties authProperties) {
        this.oauth2Props = oauth2Props;
        this.authProperties = authProperties;
    }

    private String extractDomain() {
        String issuerUri = Optional.ofNullable(oauth2Props.getJwt().getIssuerUri())
                .orElseThrow(() -> new IllegalStateException("issuer-uri not configured"));

        Pattern pattern = Pattern.compile("^(?:[^:]+://)?([^/?]+)");
        Matcher matcher = pattern.matcher(issuerUri);

        if (matcher.find()) {
            return matcher.group(1);
        }
        throw new IllegalStateException("Invalid issuer-uri format");
    }

    @Bean
    public AuthPropertiesProvider authPropertiesProvider() {
        return () -> Map.of(
                "domain", extractDomain(),
                "clientId", authProperties.getClientId(),
                "audience", String.join(",", oauth2Props.getJwt().getAudiences()),
                "scope", authProperties.getScope(),
                "fakeLogin", "false"
        );
    }
}