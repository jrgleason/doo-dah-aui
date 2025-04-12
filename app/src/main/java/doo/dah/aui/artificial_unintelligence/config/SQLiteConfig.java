package doo.dah.aui.artificial_unintelligence.config;

import org.hibernate.community.dialect.SQLiteDialect;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SQLiteConfig {
    @Bean
    public SQLiteDialect sqliteDialect() {
        return new SQLiteDialect();
    }
}