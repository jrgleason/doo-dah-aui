package doo.dah.aui.artificial_unintelligence.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.hibernate.community.dialect.SQLiteDialect;

@Configuration
public class SQLiteConfig {
    @Bean
    public SQLiteDialect sqliteDialect() {
        return new SQLiteDialect();
    }
}