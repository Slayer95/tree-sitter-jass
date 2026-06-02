import io.github.treesitter.jtreesitter.Language;
import io.github.treesitter.jtreesitter.jass.TreeSitterJass;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

public class TreeSitterJassTest {
    @Test
    public void testCanLoadLanguage() {
        assertDoesNotThrow(() -> new Language(TreeSitterJass.language()));
    }
}
