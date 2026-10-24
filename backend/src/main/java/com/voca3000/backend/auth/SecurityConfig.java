package com.voca3000.backend.auth;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.logout.CompositeLogoutHandler;
import org.springframework.security.web.authentication.logout.CookieClearingLogoutHandler;
import org.springframework.security.web.authentication.logout.LogoutHandler;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

@Configuration
public class SecurityConfig {

	@Bean
	SecurityFilterChain securityFilterChain(
		HttpSecurity http,
		ObjectProvider<ClientRegistrationRepository> clientRegistrations,
		GoogleOidcUserService googleOidcUserService,
		@Value("${app.frontend-url:http://localhost:5173}") String frontendUrl
	) throws Exception {
		http
			.authorizeHttpRequests(authorize -> authorize
				.requestMatchers("/actuator/health", "/api/csrf", "/error").permitAll()
				.requestMatchers(HttpMethod.GET, "/", "/index.html", "/assets/**", "/data/**", "/favicon.svg", "/icons.svg").permitAll()
				.requestMatchers(HttpMethod.GET, "/api/me").permitAll()
				.requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
				.anyRequest().authenticated())
			.exceptionHandling(exceptions -> exceptions
				.defaultAuthenticationEntryPointFor(
					new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED),
					request -> request.getRequestURI().startsWith("/api/")))
			.csrf(csrf -> csrf
				.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()))
			.sessionManagement(session -> session
				.sessionFixation(fixation -> fixation.changeSessionId()))
			.logout(logout -> logout
				.logoutUrl("/api/logout")
				.logoutSuccessHandler((request, response, authentication) ->
					response.setStatus(HttpStatus.NO_CONTENT.value()))
				.invalidateHttpSession(true)
				.clearAuthentication(true)
				.deleteCookies("SESSION", "JSESSIONID"));

		if (clientRegistrations.getIfAvailable() != null) {
			http.oauth2Login(oauth -> oauth
				.userInfoEndpoint(userInfo -> userInfo.oidcUserService(googleOidcUserService))
				.defaultSuccessUrl(frontendUrl, true));
		}

		return http.build();
	}

	@Bean
	LogoutHandler accountLogoutHandler() {
		return new CompositeLogoutHandler(
			new SecurityContextLogoutHandler(),
			new CookieClearingLogoutHandler("SESSION", "JSESSIONID"));
	}
}
