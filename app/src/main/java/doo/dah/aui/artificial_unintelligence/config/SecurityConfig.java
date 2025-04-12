package doo.dah.aui.artificial_unintelligence.config;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.core.authorization.OAuth2AuthorizationManagers;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtDecoders;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableMethodSecurity
@Slf4j
public class SecurityConfig {
    @Getter
    @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}")
    private String issuer;

    @Bean
    public SecurityFilterChain filterChain(
            HttpSecurity http
    ) throws Exception {
        http.oauth2ResourceServer(oauth2 -> oauth2
                        // Tells Spring Security to validate incoming JWT Bearer tokens
                        .jwt(Customizer.withDefaults())
                )
                .authorizeHttpRequests(
                        (authz) ->
                                authz
                                        .requestMatchers(
                                                "/root/protected",
                                                "/chat/**",
                                                "/config/user"
                                        ).authenticated()
                                        .requestMatchers(
                                                "/pinecone/**",
                                                "/root/admin"
                                        ).access(
                                                OAuth2AuthorizationManagers.hasScope("site:admin")
                                        )
                                        .anyRequest().permitAll()
                );
        return http.build();
    }

    @Bean
    JwtDecoder jwtDecoder() {
        return JwtDecoders.fromOidcIssuerLocation(issuer);
    }
}
