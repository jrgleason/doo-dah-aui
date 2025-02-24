package doo.dah.aui.artificial_unintelligence.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(
            HttpSecurity http
    ) throws Exception {
        http.oauth2ResourceServer(
                oauth2 -> oauth2.jwt(
                        Customizer.withDefaults()
                ))
                .authorizeHttpRequests(
                        (authz) ->
                                authz
                                        .requestMatchers("/root/protected").authenticated()
                                        .anyRequest().permitAll()
                );
        return http.build();
    }
}
