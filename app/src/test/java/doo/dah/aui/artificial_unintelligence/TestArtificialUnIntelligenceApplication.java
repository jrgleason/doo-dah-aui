package doo.dah.aui.artificial_unintelligence;

import org.springframework.boot.SpringApplication;

public class TestArtificialUnIntelligenceApplication {

	public static void main(String[] args) {
		SpringApplication.from(ArtificialUnIntelligenceApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
