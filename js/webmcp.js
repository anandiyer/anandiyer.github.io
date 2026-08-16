// WebMCP — expose a few read-only tools to agents browsing this page.
//
// https://webmachinelearning.github.io/webmcp/
//
// Nothing here duplicates site content. Each tool reads the source that already
// exists on the page:
//
//   thesis    → the Organization / Service JSON-LD in index.html's <head>
//   labs      → the nav dropdown built from _includes/header.html
//   portfolio → the portfolioCompanies array in js/script.js
//
// That is deliberate. _includes/header.html already carries a warning that the
// labs list is mirrored in three places and must be kept in sync; a fourth
// hardcoded copy in here is exactly the drift check-built-site.sh exists to
// catch. Reading the live DOM means these tools cannot go stale.

(function () {
    'use strict';

    // The API moved from navigator.modelContext to document.modelContext while
    // the spec was in flux, and shipping surfaces disagree about which one is
    // live. Take whichever the browser actually offers; register on neither if
    // the page is not in an agent context.
    var host = (typeof navigator !== 'undefined' && navigator.modelContext) ||
               (typeof document !== 'undefined' && document.modelContext);

    if (!host || typeof host.registerTool !== 'function') return;

    // Registration is tied to the page's lifetime. Aborting on pagehide
    // unregisters the tools rather than leaving them pointing at a torn-down
    // document.
    var controller = new AbortController();
    window.addEventListener('pagehide', function () { controller.abort(); }, { once: true });

    // ── Data readers ─────────────────────────────────────────────────────────

    // Pull the firm's own machine-readable description straight out of the
    // JSON-LD already in <head>, so the schema and this tool can never disagree.
    function readLinkedData(type) {
        var blocks = document.querySelectorAll('script[type="application/ld+json"]');
        for (var i = 0; i < blocks.length; i++) {
            try {
                var parsed = JSON.parse(blocks[i].textContent);
                if (parsed && parsed['@type'] === type) return parsed;
            } catch (err) {
                // A malformed block is the page's problem, not this tool's.
                // Skip it and keep looking.
            }
        }
        return null;
    }

    function readLabs() {
        var links = document.querySelectorAll('.nav-dropdown-item');
        return Array.prototype.map.call(links, function (link) {
            return {
                name: link.textContent.trim(),
                url: new URL(link.getAttribute('href'), location.origin).href
            };
        });
    }

    function readPortfolio() {
        // Defined as a top-level const in js/script.js, which runs first.
        if (typeof portfolioCompanies === 'undefined') return [];
        return portfolioCompanies
            .slice()
            .sort(function (a, b) { return a.order - b.order; })
            .map(function (company) {
                return {
                    name: company.name,
                    description: company.description,
                    website: company.website,
                    canonical_page: company.slug
                        ? location.origin + '/portfolio/' + company.slug
                        : null
                };
            });
    }

    // ── Tools ────────────────────────────────────────────────────────────────

    var READ_ONLY = { readOnlyHint: true, untrustedContentHint: false };

    var tools = [
        {
            name: 'get_canonical_thesis',
            title: 'Canonical investment thesis',
            description:
                'What Canonical, the pre-seed venture firm at canonical.cc, invests in: ' +
                'stage, typical first-check size, focus areas, and how to get in touch. ' +
                'Note this is not Canonical Ltd (canonical.com), the UK company behind ' +
                'Ubuntu Linux.',
            inputSchema: { type: 'object', properties: {}, additionalProperties: false },
            annotations: READ_ONLY,
            execute: function () {
                var org = readLinkedData('Organization');
                var service = readLinkedData('Service');
                return {
                    firm: org ? org.name : 'Canonical',
                    not_affiliated_with: 'Canonical Ltd (canonical.com), the UK company behind Ubuntu Linux',
                    description: service ? service.description : (org && org.description) || null,
                    founded: org ? org.foundingDate : null,
                    founder: org && org.founder ? org.founder.name : null,
                    focus_areas: org ? org.investmentFocus : null,
                    audience: service && service.audience ? service.audience.audienceType : null,
                    first_check: service && service.offers && service.offers.priceSpecification
                        ? {
                            currency: service.offers.priceSpecification.priceCurrency,
                            min: service.offers.priceSpecification.minPrice,
                            max: service.offers.priceSpecification.maxPrice
                        }
                        : null,
                    contact: 'hello@canonical.cc',
                    more: {
                        faq: location.origin + '/faqs',
                        llms_txt: location.origin + '/llms.txt',
                        skills: location.origin + '/.well-known/agent-skills/index.json'
                    }
                };
            }
        },
        {
            name: 'list_canonical_labs',
            title: 'Canonical Labs tools',
            description:
                'List the free, browser-based tools Canonical publishes for founders, GPs ' +
                'and LPs. No signup or account is required to use any of them.',
            inputSchema: { type: 'object', properties: {}, additionalProperties: false },
            annotations: READ_ONLY,
            execute: function () {
                var labs = readLabs();
                return { count: labs.length, labs: labs, index: location.origin + '/labs/' };
            }
        },
        {
            name: 'list_portfolio_companies',
            title: 'Canonical portfolio',
            description:
                "List the companies in Canonical's select portfolio, with what each one " +
                'does and where to read more. Optionally filter by a search term matched ' +
                'against company names and descriptions.',
            inputSchema: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Optional case-insensitive filter, e.g. "robotics" or "compute".'
                    }
                },
                additionalProperties: false
            },
            annotations: READ_ONLY,
            execute: function (input) {
                var companies = readPortfolio();
                var query = input && input.query ? String(input.query).toLowerCase() : '';

                if (query) {
                    companies = companies.filter(function (company) {
                        return (company.name + ' ' + company.description)
                            .toLowerCase()
                            .indexOf(query) !== -1;
                    });
                }

                return {
                    count: companies.length,
                    query: query || null,
                    companies: companies,
                    note: 'Select portfolio as published on canonical.cc, not necessarily every investment.',
                    full_list: location.origin + '/portfolio'
                };
            }
        }
    ];

    tools.forEach(function (tool) {
        // Registration rejects when the controller aborts, which is expected on
        // navigation — swallow it rather than logging a spurious error.
        Promise.resolve(host.registerTool(tool, { signal: controller.signal })).catch(function () {});
    });
})();
