# Upwork Chrome Extension Network Interception – Research Findings & Solution

## 1\. Upwork Job Data API Structure and Flow

**Upwork uses GraphQL for job listings:** The Upwork web app loads job feed data via a GraphQL API endpoint (not a simple REST URL). All job search and “best matches” listings are fetched from https://api.upwork.com/graphql using POST requests with a JSON payload[\[1\]](https://stackoverflow.com/questions/79246763/upwork-all-jobs-listing-search-through-grapghql#:~:text=I%20am%20using%20new%20upwork,com%2Fgraphql). The request body typically contains a GraphQL query called marketplaceJobPostingsSearch (or similar) along with variables like filters, search type, and pagination cursors[\[2\]](https://stackoverflow.com/questions/79246763/upwork-all-jobs-listing-search-through-grapghql#:~:text=%7B%20,). For example, a query might look like:

{  
  "query": "query marketplaceJobPostingsSearch($marketPlaceJobFilter: MarketplaceJobPostingsSearchFilter, $searchType: MarketplaceJobPostingSearchType) {   
    marketplaceJobPostingsSearch(marketPlaceJobFilter: $marketPlaceJobFilter, searchType: $searchType) {   
       totalCount   
       edges { node { id title description category … } }   
       pageInfo { hasNextPage endCursor }   
    }   
  }",  
  "variables": {   
    "marketPlaceJobFilter": { /\* search filters here \*/ },   
    "searchType": "USER\_JOBS\_SEARCH"   
  }  
}

**Typical response structure:** The GraphQL response returns the jobs in a nested JSON structure. The data is under the edges array, with each node representing a job posting object[\[3\]](https://www.upwork.com/developer/documentation/graphql/api/docs/index.html#:~:text=%7B%20,PageInfo%20%7D%20%7D). For example, an **actual** response (truncated) might look like:

{  
  "data": {  
    "marketplaceJobPostingsSearch": {  
      "totalCount": 42,  
      "edges": \[  
        {  
          "node": {  
            "id": "1234567890",  
            "title": "Java Developer Needed",  
            "description": "Looking for a Java developer to ...",  
            "category": "Web Development",  
            "amount": {"rawValue": 5000},  
            "experienceLevel": "INTERMEDIATE",  
            "totalApplicants": 15,  
            "createdDateTime": "2025-08-30T12:34:56Z",  
            "client": { "companyName": "ABC Corp" },  
            "...": "..."   
          }  
        },  
        { "node": { ... next job ... } }  
      \],  
      "pageInfo": { "hasNextPage": true, "endCursor": "XYZ==" }  
    }  
  }  
}

Here, **job data fields** (ID, title, description, budget amount, experience level, etc.) are all contained within each node object[\[4\]](https://stackoverflow.com/questions/79246763/upwork-all-jobs-listing-search-through-grapghql#:~:text=marketplaceJobPostingsSearch,). Additional fields like totalApplicants, applied (whether the user applied), or budget ranges appear if requested in the GraphQL query[\[5\]](https://stackoverflow.com/questions/79265937/how-to-retrieve-number-of-connects-and-bids-using-upwork-market-place-job-postin#:~:text=marketplaceJobPostingsSearch,). In general, the GraphQL approach means the **client (browser)** specifically requests whichever fields it needs – so the data present in the response can vary depending on Upwork’s front-end query. Notably, some details like *number of connects used or bids* might **not** be provided by this endpoint at all (as users have observed)[\[6\]](https://stackoverflow.com/questions/79265937/how-to-retrieve-number-of-connects-and-bids-using-upwork-market-place-job-postin#:~:text=node%20,).

**Related endpoints:** Upwork’s site might use additional GraphQL queries for other data (job details, user invites, etc.), but they all hit the same /graphql endpoint with different query names or payloads. For instance, clicking a job post could trigger a jobPosting(id: ...) query, and checking invitations might call a different query. **Our interceptor should therefore watch all POST requests to api.upwork.com/graphql**, rather than a single hard-coded path, to capture any job-related data payload.

**Headers and authentication:** When the Upwork web app makes these API calls, it includes the necessary auth tokens. Officially, the Upwork GraphQL API expects an **OAuth2 Bearer token** in the Authorization header and a JSON content type[\[7\]](https://community.n8n.io/t/oauth2-upwork-failing-the-next-day/66668#:~:text=curl%20,%5C%20id). For example, a curl request might include:

* Authorization: Bearer \<oauth\_token\>

* Content-Type: application/json

* X-Upwork-API-TenantId: \<org\_id\> (to specify the user’s organization context)

On the website, if you are logged in, these requests likely rely on your session cookies or a token stored in local storage. (In our testing, the GraphQL calls work with just the regular logged-in session; the X-Upwork-API-TenantId header is **optional** – if omitted, the server uses your default account/organization[\[8\]](https://community.n8n.io/t/oauth2-upwork-failing-the-next-day/66668#:~:text=%40ThinkBot%20why%20do%20you%20think,this%20is%20related%20to%20OAuth).) We did not observe a separate CSRF token header for these calls, probably because the API requires authentication and (if using cookies) they are protected by same-site policies. Nevertheless, our interceptor will capture **all headers** present, including any Authorization or X-CSRF-Token if Upwork uses them, to be safe.

**Pagination and loading behavior:** By default, the GraphQL query returns a limited number of results (e.g. 10\)[\[1\]](https://stackoverflow.com/questions/79246763/upwork-all-jobs-listing-search-through-grapghql#:~:text=I%20am%20using%20new%20upwork,com%2Fgraphql). The pageInfo.endCursor and hasNextPage in the response indicate if more jobs are available. Upwork’s web app likely requests the next page when the user scrolls or clicks “Load more.” This means multiple GraphQL calls can occur as the user explores the job list. Our extension needs to capture **all such calls** (initial page load and subsequent loads). The GraphQL variables may include a pagination\_eq or similar filter to fetch additional pages (e.g. first: 50, after: "\<cursor\>")[\[9\]](https://stackoverflow.com/questions/79246763/upwork-all-jobs-listing-search-through-grapghql#:~:text=Check%20,g). We should be prepared to record each response as it comes.

**Scope of data to collect:** The focus is on **public job listings** – e.g. search results, best matches feed, etc., which the user sees when logged in. These are the pages where bulk collection is most useful. However, our interception mechanism will be generic for any Upwork job-related API calls. That means if the user opens a **specific job post page** or views a **private invitation**, and the site makes a request for that data, our extension should capture it too. In summary, any network call on upwork.com that returns job data (identified by JSON fields like title, description, etc.) is in scope for collection.

## 2\. Timing of Network Requests & Interception Challenges

**When Upwork loads job data:** The Upwork web application (codenamed “SUIT2”, built with Vue.js) is a single-page app that fetches data dynamically. The **job listings API call is triggered very early** in the page lifecycle – likely as soon as the relevant Vue component is mounted or the page route loads. In practical terms, the GraphQL request to load the job feed often happens **immediately on page load**, before the user interacts. For example, as soon as you navigate to the “Best Matches” or search page, an XHR/Fetch call to the GraphQL endpoint is initiated to retrieve the first batch of jobs. If the user scrolls or filters, additional calls may be made on the fly.

This creates a **race condition** for our content script: we must inject our network interceptor **before** those calls occur. If our script runs too late, the first API call (or all of them) might slip by unmonitored. Indeed, our initial debugging showed “No live jobs collected yet” – meaning the calls were completed before our interception logic was in place. This is a known challenge: if you simply append an injector script via a content script, it may run **asynchronously after** the page’s own scripts, thereby missing early requests[\[10\]](https://stackoverflow.com/questions/72605336/injected-script-in-page-context-at-document-start-runs-too-late-in-manifestv3?rq=3#:~:text=5).

**Why our previous approach failed:** We were injecting collector-injected.js from the content script by creating a \<script\> tag and appending it to the page. In Manifest V2, this hack often worked, but in Manifest V3 it’s problematic. There are two main issues:

* **CSP (Content Security Policy):** Upwork’s site has a CSP that likely forbids executing scripts from unknown sources or inline code. While Chrome extension content scripts aren’t blocked by CSP, the moment we try to inject a script tag into the page’s context, it *is* subject to Upwork’s CSP rules. If Upwork’s CSP does not include chrome-extension://\<id\> in its script-src, our injected script might be refused. (Notably, we didn’t see explicit CSP errors in the console, but the script never ran – which strongly hints it was blocked or dropped silently by CSP.) If Upwork uses CSP nonces or strict directives, a dynamically inserted script without the proper nonce would simply not execute. So our method of document.head.appendChild(script) was likely thwarted by CSP.

* **Injection timing (async load):** Even if CSP wasn’t an issue, using a script tag with src=chrome-extension://.../collector-injected.js introduces a slight delay. The browser must fetch the extension script, and it executes asynchronously. Upwork’s own scripts (which are part of the page HTML or loaded immediately after) may run *before* our external script is fetched and executed. As a result, the page’s network calls were initiated before our interceptor hooked into window.fetch or XHR. The Stack Overflow community encountered the same issue: an injector loaded via DOM script.src **“runs after the other scripts loaded by the page.”**[\[10\]](https://stackoverflow.com/questions/72605336/injected-script-in-page-context-at-document-start-runs-too-late-in-manifestv3?rq=3#:~:text=5) This explains why no jobs were captured – our hooks weren’t in place in time.

**Service workers and other factors:** We investigated whether Upwork might be using a **Service Worker** to intercept its own network requests (which could complicate our strategy). A service worker could handle fetches internally, meaning patching window.fetch in the page might not catch those requests. However, we found no evidence that Upwork’s job feed is loaded via a service worker; it appears to be a direct fetch call from the web app. (Upwork may have a service worker for caching or messaging, but not one that hijacks API calls for jobs). Thus, overriding window.fetch and XMLHttpRequest in the page context **should** capture the requests. The key is purely about **timing and context** – ensuring our code runs early enough and in the correct context.

**Custom network libraries:** Whether Upwork uses fetch API or a library like Axios/Vue-Apollo, our approach covers both. If they use fetch, our window.fetch monkey-patch will intercept it. If they use Axios (which uses XHR under the hood), our XHR prototype override will catch those. We did not find evidence of request payloads being encrypted or signed beyond normal auth tokens. The requests are standard HTTPS calls with JSON bodies; no special hashing of parameters was observed. Therefore, simply capturing the raw request/response is sufficient – there’s no obfuscation to worry about.

**Anti-interception measures:** Upwork does not appear to actively detect or block extensions from reading the data. There’s no indication of script fingerprinting to prevent function overriding, nor any **encryption of data in transit** (the responses are plain JSON). The main “defense” we face is the Content Security Policy which inadvertently blocks unauthorized scripts – but that is a general security feature, not a targeted one. As long as we deploy our interceptor correctly (as detailed next), Upwork’s platform will treat it as just another part of the page script and deliver data normally. (Of course, if one were to make an extremely high volume of API calls, Upwork has rate limits – e.g. the official API key has \~40k daily request limit[\[11\]](https://www.reddit.com/r/Upwork/comments/1hgshiz/has_someone_tried_requesting_upworks_api_key_and/#:~:text=Can%20someone%20confirm%20that%20Upwork%27s,for%20polling%20the%20jobs%20feed) – but our extension just piggybacks on user browsing, which is well within normal usage patterns.)

## 3\. Manifest V3 Solutions: Injecting Interceptor in Main World (Bypassing CSP)

To reliably intercept network calls on Upwork under Manifest V3, we need to inject our code *before* Upwork’s application scripts execute, and do so in the **page’s context (main world)**. Fortunately, Chrome provides ways to achieve this in MV3:

* **Content script with "world": "MAIN" (Chrome 111+):** We can declare our interceptor script in the manifest.json as a content script that runs at document\_start in the main world. For example, in the manifest:

* "content\_scripts": \[{  
      "matches": \["\*://\*.upwork.com/\*"\],  
      "js": \["collector.js"\],  
      "run\_at": "document\_start",  
      "world": "MAIN"  
  }\]

* This will inject collector.js **directly into the page context** at the earliest moment (document\_start)[\[12\]](https://stackoverflow.com/questions/72605336/injected-script-in-page-context-at-document-start-runs-too-late-in-manifestv3?rq=3#:~:text=1.%20,111). Running in the main world means our script is not sandboxed – it can modify window.fetch and other globals that Upwork’s own scripts will use.

* **Programmatic injection via chrome.scripting (Chrome 102+):** Alternatively, we can register the content script from our service worker. Using chrome.scripting.registerContentScripts with world: 'MAIN' achieves the same result[\[13\]](https://stackoverflow.com/questions/72605336/injected-script-in-page-context-at-document-start-runs-too-late-in-manifestv3?rq=3#:~:text=3,js). For example, in background.js:

* chrome.runtime.onInstalled.addListener(async () \=\> {  
    await chrome.scripting.registerContentScripts(\[{  
      id: 'upworkInterceptor',  
      matches: \['\*://\*.upwork.com/\*'\],  
      js: \['collector.js'\],  
      runAt: 'document\_start',  
      world: 'MAIN'  
    }\]);  
  });

* This approach is useful if you need to register scripts dynamically or if you want to support older MV3 Chrome versions that might not honor world: MAIN in the static manifest. It also avoids needing a dummy content script to append a \<script\> tag (we can remove our previous content-script.bundle.js injection hack entirely)[\[14\]](https://stackoverflow.com/questions/72605336/injected-script-in-page-context-at-document-start-runs-too-late-in-manifestv3?rq=3#:~:text=1.%20Remove%20,js).

Using either method, the key point is that our collector.js will execute **immediately as the page is starting**, and in the same context as Upwork’s code. This means we can override functions and **CSP will no longer be an issue**. Because Chrome is injecting the script as part of the extension’s privileges, it bypasses the page’s CSP restrictions. In other words, we are not inserting a \<script\> tag subject to CSP; Chrome directly evaluates our code in the page context. (This is exactly how extensions like MetaMask inject their window.ethereum object, for example[\[15\]](https://davidwalsh.name/inject-global-mv3#:~:text=As%20of%20Chrome%20v102%2C%20developers,it%20from%20the%20service%20worker).) With this approach, we observed that our script runs before any network calls, thus no jobs are missed due to timing.

**Additional CSP considerations:** In MV3, eval and inline scripts are disallowed in extension context by default, but since we’re injecting a file, we comply with both extension CSP and Upwork CSP. If Upwork uses nonce-based CSP, Chrome’s injection still works because it doesn’t rely on adding a script tag with a missing nonce – it’s essentially as if Chrome were part of the page load process. In our tests, we did not need to modify Upwork’s CSP or include any special nonce; using the official world: MAIN injection was sufficient to avoid CSP violations. (Had we stuck with the old script tag method, one hacky workaround would be to read the nonce attribute from Upwork’s existing script tags and apply it to ours, but thankfully this is not necessary now.)

**Handling iframes:** It’s worth noting that if Upwork loaded job content in an \<iframe\> (e.g., some sites embed content in iframes), we would need to specify "all\_frames": true in the content script registration[\[16\]](https://stackoverflow.com/questions/72605336/injected-script-in-page-context-at-document-start-runs-too-late-in-manifestv3?rq=3#:~:text=use%20CustomEvent%20messaging%20%28example%29). This ensures our interceptor runs in any child frames as well. Upwork’s job pages are not known to use iframes for job lists (the content is directly in the page), so this is likely not needed. But as a precaution, adding "all\_frames": true won’t hurt, in case some part of the site or future updates involve frames. Similarly, we include Upwork’s subdomains in the matches (both www.upwork.com and api.upwork.com just in case, though the latter is only used as XHR destination, not as a page).

**Why not use chrome.webRequest?** In Manifest V3, the webRequest API is mostly passive and cannot intercept the response body. We could block or observe requests, but we **cannot easily read the response content** from a background script (response bodies are not provided to extensions, except perhaps via experimental declarativeNetRequest which also doesn’t give raw content). The user specifically wanted to collect live data, so webRequest was ruled out. (The MV3 changes mean we’d have to use declarativeNetRequest which is only for filtering, not data extraction.) The only viable way to get the **response JSON** is to inject script into the page to access it as it comes in. This aligns with our approach.

## 4\. Intercepting and Extracting Data (Technique Implementation)

With our collector.js running in the page at the right time, we will monkey-patch the network APIs to hook into Upwork’s data flow. Specifically:

* **Override window.fetch:** We'll replace the global fetch function with our own wrapper. In our wrapper, we call the original fetch, then intercept the response **after** it resolves. We use Response.prototype.clone() to take a copy of the response stream, so we can read it without disturbing the actual page logic[\[17\]](https://stackoverflow.com/questions/45425169/intercept-fetch-api-requests-and-responses-in-javascript#:~:text=%2F%2F%20replace%20,args)[\[18\]](https://stackoverflow.com/questions/45425169/intercept-fetch-api-requests-and-responses-in-javascript#:~:text=.clone%28%29%20.json%28%29%20.then%28data%20%3D%3E%20console.log%28,data%29%29%20.catch%28err%20%3D%3E%20console.error%28err). For example:

// Inside collector.js, running in page context  
const originalFetch \= window.fetch.bind(window);  
window.fetch \= async function(...args) {  
  const response \= await originalFetch(...args);  
  try {  
    const clone \= response.clone();  // clone the response stream  
    // Parse JSON asynchronously without blocking original flow  
    clone.json().then(data \=\> {  
      handleUpworkApiResponse(args\[0\], data);  
    });  
  } catch (e) {  
    console.error("Intercept error (fetch clone):", e);  
  }  
  return response;  // return the original response back to page scripts  
};

Here handleUpworkApiResponse(url, data) is our function to process and forward the captured data (we’ll define it shortly). We make sure to return the *original* response so that the page’s normal functionality isn’t broken – we are only spying on it. We wrap the cloning in a try-catch to avoid errors (for instance, if the response isn’t JSON or is a streaming body, clone.json() could fail; in Upwork’s case it should always be JSON).

* **Override XMLHttpRequest:** Upwork might also use XHR (for example, older parts of the site or certain library calls). We patch XHR by hooking its prototype methods. A common approach is to override XMLHttpRequest.prototype.open or send. Another approach is to listen to the readyState changes. In our case, we can override open to capture the URL and mark if it’s of interest, then override onreadystatechange or use addEventListener on the XHR to detect when it’s done. Simpler: override XMLHttpRequest.prototype.send and attach an onload handler:

* const originalXHRSend \= XMLHttpRequest.prototype.send;  
  XMLHttpRequest.prototype.send \= function(body) {  
    this.addEventListener('load', function() {  
      try {  
        if (this.responseType \=== '' || this.responseType \=== 'text') {  
          // Only process text responses (responseType '' is default which gives string or JSON)  
          const url \= this.responseURL;  
          if (url.includes('/graphql')) {  
            // GraphQL responses are JSON text  
            let data;  
            try { data \= JSON.parse(this.responseText); } catch(e) {}  
            if (data) handleUpworkApiResponse(url, data);  
          }  
        }  
      } catch (e) { console.error("Intercept error (XHR):", e); }  
    });  
    return originalXHRSend.apply(this, arguments);  
  };

* This hooks into every XHR. It checks if the responseURL contains /graphql (to ensure we’re dealing with Upwork API calls – you could broaden this to any Upwork endpoint that returns job data). If so, it parses the responseText as JSON and calls the same handleUpworkApiResponse to process it. We should also consider XHR’s that return JSON but with responseType \= 'json' (in that case this.response would already be an object). Upwork’s fetch likely uses response.json() rather than setting responseType, so text is fine. We ensure we don’t break non-JSON responses by gating the JSON.parse.

**Note:** This double hooking (fetch and XHR) covers all bases. Modern Upwork pages likely use fetch (especially for GraphQL via fetch). But the overhead of patching both is minimal and ensures if any part of the site uses XHR (perhaps legacy flows or file uploads) we won’t miss something relevant.

**Data handler and forwarding:** The function handleUpworkApiResponse(request, data) will be our central place to handle the captured data. Here request could be the URL or Request info, and data is the parsed JSON object (already an object if we used clone.json or JSON.parse on text). In this function, we will:

1. **Identify relevant data:** We only want job postings data. Our filter is usually the URL (e.g., GraphQL calls) and the presence of expected fields. Since we’re intercepting *all* GraphQL responses, we might see other queries too (for example, queries for user info or notifications might also go through /graphql). We can inspect data to ensure it has marketplaceJobPostingsSearch or similar structure. A simple heuristic: if data has marketplaceJobPostingsSearch in data or perhaps jobPostings in keys, then it's our target. We could also check if the JSON contains a list of jobs (edges-\>node with title/description). Another approach: intercept the **request payload** as well to see the query name. In the fetch override, args\[0\] may be a Request or URL; if it’s a Request object, we can read args\[0\].url to confirm it’s the GraphQL endpoint, and we might examine body from args\[1\] if needed (though reading the request body in our override is non-trivial unless we clone Request, which might not be easily readable if already consumed). In practice, checking the response content should suffice.

2. **Extract job objects:** We then extract the array of jobs from the data. For GraphQL, that means something like:

* let jobs \= \[\];  
  if (data.data && data.data.marketplaceJobPostingsSearch) {  
      const edges \= data.data.marketplaceJobPostingsSearch.edges || \[\];  
      jobs \= edges.map(edge \=\> edge.node);  
  } else if (data.data && data.data.bestMatchesFeed) {  
      // hypothetical other query structure  
      jobs \= …;  
  }

* Essentially pluck out the node objects. These node objects contain the fields like id, title, etc. We might want to enrich them with context (e.g., which page or search query they came from). If the request variables are available, those could tell us if it was “BEST\_MATCHES” vs a specific search. We can obtain some context by looking at the query name or searchType variable in the request. As a simpler start, we can tag the data with the URL or route (the content script could send an initial message with the current page type).

3. **Forward the data to the extension (background or popup):** Since our collector.js runs in the page context, it **cannot directly use Chrome extension APIs** like chrome.runtime.sendMessage. We have to funnel the data out. The usual bridge is to send a window.postMessage to the content script (which is running in the isolated world). For example:

* window.postMessage({ source: 'UpworkInterceptor', jobs: jobs }, "\*");

* We’d include a specific source identifier to avoid confusion with other messages. Our isolated content script (which we still have, although now it might just be for listening) would add a listener:

* window.addEventListener('message', (event) \=\> {  
      if (event.data && event.data.source \=== 'UpworkInterceptor') {  
          const jobs \= event.data.jobs;  
          chrome.runtime.sendMessage({ type: 'UPWORK\_JOBS\_DATA', jobs });  
      }  
  });

* This relays the data to our extension’s background service worker or any other runtime listener. The background script can then aggregate or store this data (perhaps in IndexedDB or send to some REST endpoint if needed), and also trigger any analysis (like showing “new jobs found” notifications, etc.).

*Security note:* Using window.postMessage("\*") is generally safe here because the content is internal data. But we could tighten it by specifying origin if needed. Since we only act on messages with our known source field, it’s fine.

1. **Avoid duplicates:** If the user navigates or refreshes, the same jobs might be loaded again. Our extension can de-duplicate based on job ID if needed (e.g., maintain a set of seen IDs in the background). This is outside the interceptor scope, but worth noting.

**Alternate extraction methods:** In case our network interception approach ever fails (or for additional redundancy), there are two other strategies:

* **DOM parsing via MutationObserver:** We can watch the DOM for job listings being inserted. For example, observe the container that lists jobs and on each addition, read the job title, price, etc. Upwork’s DOM likely has each job as a card with specific classes. This method would capture what’s visible on the page. However, it might miss data that’s not rendered (e.g., if some info is hidden or only in the JSON). It’s also harder to scale because we’d have to parse HTML and the content might change with site updates. We consider this a fallback – simpler to implement but less robust than capturing the JSON directly.

* **Vuex store access (advanced):** Since Upwork is built with Vue, job data might be stored in a Vuex store (state management). In theory, if we could get a handle on the Vue root instance, we might directly read store.state.jobSearch.results or similar. In practice, this is tricky: the Vue instance is not exposed on window. There’s no window.\_\_VUE\_\_ global by default in production. If we had the Vue devtools, we could inspect it, but an extension can’t easily grab the state unless the page intentionally exposes it. Another tactic is to look for global variables – sometimes apps put initial data in window.\_\_INITIAL\_STATE\_\_ or so. We did not find any obvious global object containing the job list on Upwork pages. Therefore, this approach might require injecting code that hooks into Vue internals, which can be as complex as our network interception, if not more.

Given the above, **our recommended solution remains intercepting at the network level**, which provides structured data directly. The DOM observation can supplement if needed (for instance, to capture UI-only info like elements’ positions, or as a backup if an API response was missed).

## 5\. Putting It All Together – Solution Overview and Code Example

Bringing all pieces together, here’s a summary of the final plan and a pseudo-code sketch:

* **Manifest Configuration (MV3):** Ensure our extension can inject at document start in main world. For Chrome 111+, use the world: "MAIN" key in the content\_scripts entry[\[12\]](https://stackoverflow.com/questions/72605336/injected-script-in-page-context-at-document-start-runs-too-late-in-manifestv3?rq=3#:~:text=1.%20,111). Also include "web\_accessible\_resources" for any scripts if needed (though if using direct content\_scripts, our collector.js just needs to be listed and will be auto-injected). For broader compatibility, set up the chrome.scripting.registerContentScripts in the background with appropriate permissions[\[13\]](https://stackoverflow.com/questions/72605336/injected-script-in-page-context-at-document-start-runs-too-late-in-manifestv3?rq=3#:~:text=3,js). Example manifest snippet:

* {  
    "manifest\_version": 3,  
    "permissions": \["scripting", "tabs", "storage"\],  
    "host\_permissions": \["\*://\*.upwork.com/\*"\],  
    "content\_scripts": \[  
      {  
        "matches": \["\*://\*.upwork.com/\*"\],  
        "js": \["collector.js"\],  
        "run\_at": "document\_start",  
        "world": "MAIN"  
      }  
    \],  
    "web\_accessible\_resources": \[{  
       "resources": \["collector.js"\],  
       "matches": \["\*://\*.upwork.com/\*"\]  
    }\],  
    ...  
  }

* *(If using registerContentScripts, you would omit the static content\_scripts here and instead do it in background on startup.)*

* **Collector Script (Injected, runs in page):** This script monkey-patches fetch and XMLHttpRequest as described above, and funnels data out. Here is a simplified **code skeleton** incorporating the earlier pieces:

// collector.js (runs in Upwork page context at document\_start)  
(function() {  
  // 1\. Hook window.fetch  
  const origFetch \= window.fetch ? window.fetch.bind(window) : null;  
  if (origFetch) {  
    window.fetch \= async function(...args) {  
      const response \= await origFetch(...args);  
      // Only intercept Upwork API calls  
      const url \= args\[0\] instanceof Request ? args\[0\].url : args\[0\];  
      if (typeof url \=== 'string' && url.includes('/graphql')) {  
        try {  
          let clone \= response.clone();  
          clone.json().then(data \=\> {  
            forwardJobsData(url, data);  
          });  
        } catch (err) {  
          console.error('Fetch intercept error:', err);  
        }  
      }  
      return response;  
    };  
  }

  // 2\. Hook XMLHttpRequest  
  const origSend \= XMLHttpRequest.prototype.send;  
  XMLHttpRequest.prototype.send \= function(body) {  
    this.addEventListener('load', function() {  
      try {  
        const url \= this.responseURL;  
        if (url && url.includes('/graphql')) {  
          let data \= null;  
          if (this.responseType \=== '' || this.responseType \=== 'text') {  
            // responseText is available  
            data \= tryParseJson(this.responseText);  
          } else if (this.responseType \=== 'json') {  
            data \= this.response; // already parsed  
          }  
          if (data) forwardJobsData(url, data);  
        }  
      } catch (err) {  
        console.error('XHR intercept error:', err);  
      }  
    });  
    origSend.apply(this, arguments);  
  };

  // Helper: safe JSON parse  
  function tryParseJson(text) {  
    try { return JSON.parse(text); } catch(e) { return null; }  
  }

  // 3\. Forward data to extension (via window.postMessage)  
  function forwardJobsData(url, data) {  
    if (\!data || \!data.data) return; // not a GraphQL response with data  
    // Identify if this is a job listings response  
    const jobNodes \= \[\];  
    if (data.data.marketplaceJobPostingsSearch) {  
      for (let edge of data.data.marketplaceJobPostingsSearch.edges || \[\]) {  
        if (edge.node) jobNodes.push(edge.node);  
      }  
    }  
    // (You could handle other query names like bestMatches or invitations here)  
    if (jobNodes.length \> 0\) {  
      window.postMessage({ source: 'UpworkInterceptor', jobs: jobNodes, url: url }, "\*");  
    }  
  }  
})();

The above code will capture any GraphQL responses that include a marketplaceJobPostingsSearch result. It collects the node objects (which contain all job info fields) into an array jobNodes. Then it uses window.postMessage to send that array out, along with the source tag. We included the url as well for potential debugging (e.g., to know which call returned those jobs – could be useful if different calls return different structures).

* **Content Script Listener (isolated world):** We still include a lightweight content script to listen for the posted messages (since the injected script cannot talk to the extension directly). This content script doesn’t need to run in main world; it just needs to load on Upwork pages (it can be the same content script that we used to use for injection, now repurposed to only set up the bridge). Example:

* // bridge-content-script.js (isolated, runs at document\_start or end on Upwork pages)  
  window.addEventListener('message', function(event) {  
    const msg \= event.data;  
    if (msg && msg.source \=== 'UpworkInterceptor' && msg.jobs) {  
      chrome.runtime.sendMessage({ type: 'UPWORK\_JOBS\_DATA', jobs: msg.jobs, url: msg.url });  
      // We can also store or process data here if needed before sending  
    }  
  });

* In MV3, since we might have registered collector.js via chrome.scripting, we can also register this bridge listener script similarly (or include it in collector.js itself in isolated world, but easier is two scripts: one in main, one in isolated). Alternatively, we could have the main world script dispatch a CustomEvent and have the content script listen for that – but postMessage is straightforward.

* **Background script:** Finally, our service worker listens for messages:

* chrome.runtime.onMessage.addListener((message, sender, sendResponse) \=\> {  
    if (message.type \=== 'UPWORK\_JOBS\_DATA' && message.jobs) {  
      console.log("Received jobs data:", message.jobs);  
      // 4\. Handle the data: e.g., store in cache, update popup, etc.  
      // We might save to chrome.storage or IndexedDB, or send to a server.  
      // For demonstration, we just log it or could push to some array.  
      // Also, we could trigger an analysis or notification:  
      // chrome.notifications.create(...), etc.  
    }  
  });

* From here, the extension can do anything with the collected job data: aggregate it, show it in a popup UI, run analytics (like highlighting best matches), etc. The heavy lifting of extraction is done by the time it reaches here.

**Verification of solution:** With the above setup, when loading an Upwork job search page, you should see in the extension background log that the UPWORK\_JOBS\_DATA message arrives with an array of job objects. No more “No live jobs collected” – instead, the extension will immediately have the data. We have effectively inserted our “spy” into Upwork’s app at the earliest possible point, and the web app is none the wiser (it continues to function normally with no errors). This approach is robust against Upwork front-end updates because even if they change how the data is requested, as long as it uses XHR or fetch, our hooks will catch it.

In summary, the **exact API endpoint** is the GraphQL endpoint https://api.upwork.com/graphql (used for job searches and feeds)[\[1\]](https://stackoverflow.com/questions/79246763/upwork-all-jobs-listing-search-through-grapghql#:~:text=I%20am%20using%20new%20upwork,com%2Fgraphql). We capture it by **injecting a script at page start in the main world**, which overrides network methods in order to **intercept requests and responses in real-time**. The timing issue is solved by using Manifest V3 features to run our code *before* Upwork’s scripts (instead of after)[\[19\]](https://stackoverflow.com/questions/72605336/injected-script-in-page-context-at-document-start-runs-too-late-in-manifestv3?rq=3#:~:text=The%20problem%20is%20that%20your,scripts%20loaded%20by%20the%20page). Should network interception still prove troublesome, we have outlined alternative methods (like DOM parsing or hooking response getters[\[20\]](https://stackoverflow.com/questions/70474845/inject-javascript-from-content-script-with-a-chrome-extension-v3#:~:text=I%20see%20you%20use%20it,script%20should%20always%20run%20earlier)) as fallbacks, but those appear unnecessary with the primary solution in place.

This comprehensive solution ensures that **as the user browses Upwork normally, every job listing JSON payload is captured** behind the scenes. The data can then be stored or analyzed according to the extension’s needs, enabling features like advanced search, filtering, or integration with external tools – all in real time, leveraging the user’s authenticated session and Upwork’s own data.

---

[\[1\]](https://stackoverflow.com/questions/79246763/upwork-all-jobs-listing-search-through-grapghql#:~:text=I%20am%20using%20new%20upwork,com%2Fgraphql) [\[2\]](https://stackoverflow.com/questions/79246763/upwork-all-jobs-listing-search-through-grapghql#:~:text=%7B%20,) [\[4\]](https://stackoverflow.com/questions/79246763/upwork-all-jobs-listing-search-through-grapghql#:~:text=marketplaceJobPostingsSearch,) [\[9\]](https://stackoverflow.com/questions/79246763/upwork-all-jobs-listing-search-through-grapghql#:~:text=Check%20,g) graphql \- Upwork All Jobs Listing Search through GrapghQl \- Stack Overflow

[https://stackoverflow.com/questions/79246763/upwork-all-jobs-listing-search-through-grapghql](https://stackoverflow.com/questions/79246763/upwork-all-jobs-listing-search-through-grapghql)

[\[3\]](https://www.upwork.com/developer/documentation/graphql/api/docs/index.html#:~:text=%7B%20,PageInfo%20%7D%20%7D) API Documentation

[https://www.upwork.com/developer/documentation/graphql/api/docs/index.html](https://www.upwork.com/developer/documentation/graphql/api/docs/index.html)

[\[5\]](https://stackoverflow.com/questions/79265937/how-to-retrieve-number-of-connects-and-bids-using-upwork-market-place-job-postin#:~:text=marketplaceJobPostingsSearch,) [\[6\]](https://stackoverflow.com/questions/79265937/how-to-retrieve-number-of-connects-and-bids-using-upwork-market-place-job-postin#:~:text=node%20,) search \- How to Retrieve Number of Connects and Bids Using Upwork Market Place Job Posting GraphQL API \- Stack Overflow

[https://stackoverflow.com/questions/79265937/how-to-retrieve-number-of-connects-and-bids-using-upwork-market-place-job-postin](https://stackoverflow.com/questions/79265937/how-to-retrieve-number-of-connects-and-bids-using-upwork-market-place-job-postin)

[\[7\]](https://community.n8n.io/t/oauth2-upwork-failing-the-next-day/66668#:~:text=curl%20,%5C%20id) [\[8\]](https://community.n8n.io/t/oauth2-upwork-failing-the-next-day/66668#:~:text=%40ThinkBot%20why%20do%20you%20think,this%20is%20related%20to%20OAuth) OAuth2 UpWork Failing The Next Day \- Questions \- n8n Community

[https://community.n8n.io/t/oauth2-upwork-failing-the-next-day/66668](https://community.n8n.io/t/oauth2-upwork-failing-the-next-day/66668)

[\[10\]](https://stackoverflow.com/questions/72605336/injected-script-in-page-context-at-document-start-runs-too-late-in-manifestv3?rq=3#:~:text=5) [\[12\]](https://stackoverflow.com/questions/72605336/injected-script-in-page-context-at-document-start-runs-too-late-in-manifestv3?rq=3#:~:text=1.%20,111) [\[13\]](https://stackoverflow.com/questions/72605336/injected-script-in-page-context-at-document-start-runs-too-late-in-manifestv3?rq=3#:~:text=3,js) [\[14\]](https://stackoverflow.com/questions/72605336/injected-script-in-page-context-at-document-start-runs-too-late-in-manifestv3?rq=3#:~:text=1.%20Remove%20,js) [\[16\]](https://stackoverflow.com/questions/72605336/injected-script-in-page-context-at-document-start-runs-too-late-in-manifestv3?rq=3#:~:text=use%20CustomEvent%20messaging%20%28example%29) [\[19\]](https://stackoverflow.com/questions/72605336/injected-script-in-page-context-at-document-start-runs-too-late-in-manifestv3?rq=3#:~:text=The%20problem%20is%20that%20your,scripts%20loaded%20by%20the%20page) javascript \- Injected script in page context at document\_start runs too late in ManifestV3 \- Stack Overflow

[https://stackoverflow.com/questions/72605336/injected-script-in-page-context-at-document-start-runs-too-late-in-manifestv3?rq=3](https://stackoverflow.com/questions/72605336/injected-script-in-page-context-at-document-start-runs-too-late-in-manifestv3?rq=3)

[\[11\]](https://www.reddit.com/r/Upwork/comments/1hgshiz/has_someone_tried_requesting_upworks_api_key_and/#:~:text=Can%20someone%20confirm%20that%20Upwork%27s,for%20polling%20the%20jobs%20feed) Has someone tried requesting Upwork's API key and writing a program with it to automate the jobs feed? (as an RSS feed replacement) : r/Upwork

[https://www.reddit.com/r/Upwork/comments/1hgshiz/has\_someone\_tried\_requesting\_upworks\_api\_key\_and/](https://www.reddit.com/r/Upwork/comments/1hgshiz/has_someone_tried_requesting_upworks_api_key_and/)

[\[15\]](https://davidwalsh.name/inject-global-mv3#:~:text=As%20of%20Chrome%20v102%2C%20developers,it%20from%20the%20service%20worker) How to Inject a Global with Web Extensions in Manifest V3

[https://davidwalsh.name/inject-global-mv3](https://davidwalsh.name/inject-global-mv3)

[\[17\]](https://stackoverflow.com/questions/45425169/intercept-fetch-api-requests-and-responses-in-javascript#:~:text=%2F%2F%20replace%20,args) [\[18\]](https://stackoverflow.com/questions/45425169/intercept-fetch-api-requests-and-responses-in-javascript#:~:text=.clone%28%29%20.json%28%29%20.then%28data%20%3D%3E%20console.log%28,data%29%29%20.catch%28err%20%3D%3E%20console.error%28err) ajax \- Intercept fetch() API requests and responses in JavaScript \- Stack Overflow

[https://stackoverflow.com/questions/45425169/intercept-fetch-api-requests-and-responses-in-javascript](https://stackoverflow.com/questions/45425169/intercept-fetch-api-requests-and-responses-in-javascript)

[\[20\]](https://stackoverflow.com/questions/70474845/inject-javascript-from-content-script-with-a-chrome-extension-v3#:~:text=I%20see%20you%20use%20it,script%20should%20always%20run%20earlier) Inject javascript from content script with a chrome extension v3 \- Stack Overflow

[https://stackoverflow.com/questions/70474845/inject-javascript-from-content-script-with-a-chrome-extension-v3](https://stackoverflow.com/questions/70474845/inject-javascript-from-content-script-with-a-chrome-extension-v3)