package doo.dah.aui.artificial_unintelligence.repos;

import doo.dah.aui.artificial_unintelligence.models.UserQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface UserQuestionRepository extends JpaRepository<UserQuestion, Long> {

    List<UserQuestion> findByUsername(String username);

    List<UserQuestion> findByTimestampBetween(Instant start, Instant end);
}
