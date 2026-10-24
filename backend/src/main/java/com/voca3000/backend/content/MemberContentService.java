package com.voca3000.backend.content;

import java.io.IOException;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.ResponseStatus;

@Service
public class MemberContentService {

	private final ObjectMapper objectMapper;

	public MemberContentService(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	public JsonNode loadIndex(String language, int maxDay) {
		JsonNode source = readJson(indexFile(language));
		ArrayNode filtered = objectMapper.createArrayNode();
		source.forEach(item -> {
			if (item.path("day").asInt() <= maxDay) {
				filtered.add(item);
			}
		});
		return filtered;
	}

	public JsonNode loadDay(String language, int day) {
		return readJson(dayFile(language, day));
	}

	private JsonNode readJson(String fileName) {
		try (var input = new ClassPathResource("member-data/" + fileName).getInputStream()) {
			return objectMapper.readTree(input);
		} catch (IOException error) {
			throw new ContentNotFoundException(error);
		}
	}

	private String indexFile(String language) {
		return switch (language) {
			case "english" -> "words-index.json";
			case "japanese" -> "japanese-words-index.json";
			default -> throw new ContentNotFoundException();
		};
	}

	private String dayFile(String language, int day) {
		String number = String.format("%02d", day);
		return switch (language) {
			case "english" -> "words-day" + number + ".json";
			case "japanese" -> "japanese-words-day" + number + ".json";
			default -> throw new ContentNotFoundException();
		};
	}

	@ResponseStatus(HttpStatus.NOT_FOUND)
	public static class ContentNotFoundException extends RuntimeException {
		ContentNotFoundException() {
		}

		ContentNotFoundException(Throwable cause) {
			super(cause);
		}
	}
}
