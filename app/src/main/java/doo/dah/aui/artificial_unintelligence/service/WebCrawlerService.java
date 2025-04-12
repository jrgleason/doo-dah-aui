package doo.dah.aui.artificial_unintelligence.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebCrawlerService {
    // Elements to exclude from the content
    private static final String[] ELEMENTS_TO_REMOVE = {
            "script", "style", "iframe", "nav", "footer", "header",
            "form", "button", "noscript", "svg", "canvas", "input"
    };
    private final RestTemplate restTemplate;
    private final DocumentProcessingService documentProcessingService;
    private final ExecutorService executorService = Executors.newFixedThreadPool(5);
    // Patterns for URLs to skip
    private final List<Pattern> skipUrlPatterns = Arrays.asList(
            Pattern.compile(".*\\.(css|js|bmp|gif|jpe?g|png|tiff?|mid|mp2|mp3|mp4|wav|avi|mov|mpeg|ram|m4v|pdf|rm|smil|wmv|swf|wma|zip|rar|gz)$"),
            Pattern.compile(".*/(wp-admin|wp-includes|wp-content/plugins)/.*"),
            Pattern.compile(".*/feed/.*")
    );
    @Value("${crawler.max-pages-per-domain:100}")
    private int maxPagesPerDomain;
    @Value("${crawler.delay-between-requests:1000}")
    private long delayBetweenRequests;

    /**
     * Crawl a website asynchronously and process its content
     *
     * @param baseUrl  The starting URL
     * @param maxDepth How deep to crawl
     * @param title    Optional title to include in metadata
     * @param tags     Optional tags to include in metadata
     * @return CompletableFuture that will contain the crawl results
     */
    public CompletableFuture<Map<String, Object>> crawlSite(String baseUrl, int maxDepth, String title, List<String> tags) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                log.info("Starting site crawl from URL: {}, depth: {}", baseUrl, maxDepth);

                // Prepare results
                Map<String, Object> result = new HashMap<>();
                Set<String> visitedUrls = Collections.synchronizedSet(new HashSet<>());
                Map<String, Integer> pagesPerDomain = new ConcurrentHashMap<>();
                int[] pageCount = {0};
                int[] chunkCount = {0};

                // Process the first URL
                try {
                    processUrl(baseUrl, 0, maxDepth, visitedUrls, pagesPerDomain, pageCount, chunkCount, title, tags);
                } catch (Exception e) {
                    log.error("Error processing starting URL: {}", e.getMessage());
                }

                result.put("baseUrl", baseUrl);
                result.put("pagesProcessed", pageCount[0]);
                result.put("chunksStored", chunkCount[0]);
                result.put("message", String.format("Processed %d pages into %d chunks", pageCount[0], chunkCount[0]));

                log.info("Completed site crawl from URL: {}, processed {} pages into {} chunks",
                        baseUrl, pageCount[0], chunkCount[0]);

                return result;
            } catch (Exception e) {
                log.error("Error during site crawl: {}", e.getMessage());
                Map<String, Object> errorResult = new HashMap<>();
                errorResult.put("error", e.getMessage());
                return errorResult;
            }
        }, executorService);
    }

    /**
     * Process a specific URL, extract content and follow links
     */
    private void processUrl(String url, int currentDepth, int maxDepth,
                            Set<String> visitedUrls, Map<String, Integer> pagesPerDomain,
                            int[] pageCount, int[] chunkCount, String title, List<String> tags) {
        // Skip if already visited
        if (!visitedUrls.add(url)) {
            return;
        }

        try {
            // Extract domain from URL
            URL urlObj = URI.create(url).toURL();
            String domain = urlObj.getHost();

            // Check domain crawl limit
            int domainPageCount = pagesPerDomain.getOrDefault(domain, 0);
            if (domainPageCount >= maxPagesPerDomain) {
                log.info("Reached maximum pages ({}) for domain: {}", maxPagesPerDomain, domain);
                return;
            }
            pagesPerDomain.put(domain, domainPageCount + 1);

            log.info("Processing URL: {} (depth: {})", url, currentDepth);

            // Fetch and parse the page
            Document doc = fetchPage(url);

            // Clean and process the content
            int chunks = processContent(url, doc, title, tags);
            synchronized (chunkCount) {
                chunkCount[0] += chunks;
            }

            synchronized (pageCount) {
                pageCount[0]++;
            }

            // If we haven't reached max depth, extract and follow links
            if (currentDepth < maxDepth) {
                Set<String> links = extractLinks(doc, urlObj);

                // Follow each link
                for (String link : links) {
                    if (!visitedUrls.contains(link)) {
                        // Add delay between requests
                        try {
                            Thread.sleep(delayBetweenRequests);
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                        }

                        processUrl(link, currentDepth + 1, maxDepth, visitedUrls,
                                pagesPerDomain, pageCount, chunkCount, null, tags);
                    }
                }
            }

        } catch (MalformedURLException e) {
            log.warn("Invalid URL: {}", url);
        } catch (Exception e) {
            log.error("Error processing URL {}: {}", url, e.getMessage());
        }
    }

    /**
     * Fetch and parse a web page
     */
    private Document fetchPage(String url) {
        String responseBody = restTemplate.getForObject(url, String.class);
        assert responseBody != null;
        return Jsoup.parse(responseBody, url);
    }


    /**
     * Process the content of a page, clean it and store in vector DB
     */
    private int processContent(String url, Document doc, String titleOverride, List<String> tags) {
        // Remove unwanted elements
        for (String elementTag : ELEMENTS_TO_REMOVE) {
            doc.select(elementTag).remove();
        }

        // Extract clean text content
        String title = titleOverride != null ? titleOverride : doc.title();
        String cleanContent = doc.body().text();

        // Skip if content is too small
        if (cleanContent.length() < 50) {
            log.info("Content too small for URL: {}", url);
            return 0;
        }

        // Create metadata
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("source", url);
        metadata.put("title", title);
        metadata.put("crawlDate", System.currentTimeMillis());

        if (tags != null && !tags.isEmpty()) {
            metadata.put("tags", tags);
        }

        try {
            // Use the existing document processing service
            int chunks = documentProcessingService.processDocument(
                    cleanContent,
                    metadata
            );

            log.info("Processed content from URL: {} into {} chunks", url, chunks);
            return chunks;
        } catch (Exception e) {
            log.error("Error storing content from URL {}: {}", url, e.getMessage());
            return 0;
        }
    }

    /**
     * Extract links from a page for further crawling
     */
    private Set<String> extractLinks(Document doc, URL baseUrl) {
        Set<String> links = new HashSet<>();
        String baseHost = baseUrl.getHost();

        Elements anchorElements = doc.select("a[href]");
        for (Element link : anchorElements) {
            String href = link.attr("abs:href");

            // Skip empty or invalid URLs
            if (!href.startsWith("http")) {
                continue;
            }

            // Normalize URL (remove fragments, etc.)
            href = normalizeUrl(href);

            // Skip URLs that match skip patterns
            if (shouldSkipUrl(href)) {
                continue;
            }

            // Check if URL is on the same domain or subdomain
            try {
                URL linkUrl = URI.create(href).toURL();
                String linkHost = linkUrl.getHost();

                // Only follow links on same domain or subdomains
                if (!linkHost.equals(baseHost) && !linkHost.endsWith("." + baseHost)) {
                    continue;
                }

                links.add(href);
            } catch (MalformedURLException e) {
                // Skip invalid URLs
            }
        }

        return links;
    }

    /**
     * Check if a URL should be skipped based on predefined patterns
     */
    private boolean shouldSkipUrl(String url) {
        for (Pattern pattern : skipUrlPatterns) {
            if (pattern.matcher(url).matches()) {
                return true;
            }
        }
        return false;
    }

    /**
     * Normalize URL by removing fragments and trailing slashes
     */
    private String normalizeUrl(String url) {
        // Remove fragment
        int fragmentIndex = url.indexOf('#');
        if (fragmentIndex > 0) {
            url = url.substring(0, fragmentIndex);
        }

        // Remove trailing slash
        if (url.endsWith("/")) {
            url = url.substring(0, url.length() - 1);
        }

        return url;
    }
}