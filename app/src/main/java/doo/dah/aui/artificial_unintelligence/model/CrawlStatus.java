package doo.dah.aui.artificial_unintelligence.model;

import lombok.Data;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

@Data
public class CrawlStatus {
    private final String rootUrl;
    private final AtomicBoolean active = new AtomicBoolean(false);
    private final AtomicInteger pagesProcessed = new AtomicInteger(0);
    private final AtomicInteger failedUrls = new AtomicInteger(0);
    private final AtomicInteger chunksStored = new AtomicInteger(0);
    private final AtomicInteger activeThreads = new AtomicInteger(0);
    private final List<String> processedUrls = Collections.synchronizedList(new ArrayList<>());
    private final List<String> failedUrlsList = Collections.synchronizedList(new ArrayList<>());
    private long startTime;
    private long endTime;
    private String error;

    public CrawlStatus(String rootUrl) {
        this.rootUrl = rootUrl;
    }

    public boolean isActive() {
        return active.get();
    }

    public void setActive(boolean active) {
        this.active.set(active);
    }

    public int getPagesProcessed() {
        return pagesProcessed.get();
    }

    public void incrementPagesProcessed() {
        pagesProcessed.incrementAndGet();
    }

    public int getFailedUrls() {
        return failedUrls.get();
    }

    public void incrementFailedUrls() {
        failedUrls.incrementAndGet();
    }

    public int getChunksStored() {
        return chunksStored.get();
    }

    public void incrementChunksStored(int count) {
        chunksStored.addAndGet(count);
    }

    public void addProcessedUrl(String url) {
        processedUrls.add(url);
    }

    public void addFailedUrl(String url) {
        failedUrlsList.add(url);
    }

    public int getActiveThreads() {
        return activeThreads.get();
    }

    public void incrementActiveThreads() {
        activeThreads.incrementAndGet();
    }

    public void decrementActiveThreads() {
        activeThreads.decrementAndGet();
    }

    public List<String> getProcessedUrls() {
        return new ArrayList<>(processedUrls);
    }

    public List<String> getFailedUrlsList() {
        return new ArrayList<>(failedUrlsList);
    }
}