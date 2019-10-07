// Hash: fim5Fl8BduZ9n9CpZ6DMO3fED6xVAXdHoERf9JGsFHgZ9ksTWhqZcIKkrXg9uTs7mPgED5dDP/Bd5zNAxdd6uRodbfN5SPl0gAYBcqgTBXuMrmRgoldK6to8UubW3aMAWjdCC6dUr0UTeZlIZpAkBJlrxr8RrRF9Y9WQj45iDME=
(function () {
    'use strict';

    // tslint:disable:no-console
    var LogLevel;
    (function (LogLevel) {
        LogLevel[LogLevel["Error"] = 0] = "Error";
        LogLevel[LogLevel["Warning"] = 1] = "Warning";
        LogLevel[LogLevel["Debug"] = 2] = "Debug";
    })(LogLevel || (LogLevel = {}));
    var Log = /** @class */ (function () {
        function Log() {
        }
        Log.Debug = function (m) {
            if (window.console && Log.LOGLEVEL >= LogLevel.Debug) {
                console.log("PubTag [DEBUG]:" + m);
            }
        };
        Log.Warning = function (m) {
            if (window.console && Log.LOGLEVEL >= LogLevel.Warning) {
                console.log("PubTag [WARNING]:" + m);
            }
        };
        Log.Error = function (m) {
            if (Log.LOGLEVEL >= LogLevel.Error) {
                if (window.console) {
                    console.log("PubTag [ERROR]:" + m);
                }
                else {
                    alert("PubTag [ERROR]:" + m);
                }
            }
        };
        Log.LOGLEVEL = LogLevel.Error;
        return Log;
    }());
    function SetLogLevel(logLevel) {
        Log.LOGLEVEL = logLevel;
    }

    var TimeMeasurer = /** @class */ (function () {
        // We store the callback to the "now" method to not have to do the existance check every time
        function TimeMeasurer(useWindowPerformance) {
            if (useWindowPerformance === void 0) { useWindowPerformance = true; }
            if (useWindowPerformance && window.performance && window.performance.now) {
                this.now = window.performance.now.bind(window.performance);
            }
            else if (Date.now) {
                this.now = Date.now;
            }
            else {
                this.now = function () {
                    return new Date().getTime();
                };
            }
        }
        // Create an already-running TimeMeasurer
        TimeMeasurer.CreateRunning = function () {
            var timer = new TimeMeasurer();
            timer.start();
            return timer;
        };
        TimeMeasurer.CreateWithStartTime = function (startTime) {
            // As start time is a timestamp we dont want to use window performance as it is relative to window
            var timer = new TimeMeasurer(false);
            timer.startTime = startTime;
            return timer;
        };
        // Return the number of milliseconds elapsed since the time origin
        TimeMeasurer.TimeSincePageLoad = function () {
            if (window.performance) {
                if (window.performance.now) {
                    return window.performance.now();
                }
                if (window.performance.timing && window.performance.timing.navigationStart) {
                    return new Date().getTime() - performance.timing.navigationStart;
                }
            }
            return 0;
        };
        // Start or restart
        TimeMeasurer.prototype.start = function () {
            this.startTime = this.now();
        };
        TimeMeasurer.prototype.elapsed = function () {
            var now = this.now();
            return now - this.startTime;
        };
        return TimeMeasurer;
    }());

    function tryParseJson(str) {
        try {
            return JSON.parse(str);
        }
        catch (e) {
            return undefined;
        }
    }

    var CRITEO_VENDOR_ID = 91;
    var cmpCallbacks = {};
    function hasCMP(currentWindow) {
        return cmpInFrame(currentWindow) || getCMPFrame(currentWindow) !== undefined;
    }
    function retrieveGDPRConsent(currentWindow, callback, timeout) {
        if (timeout === void 0) { timeout = 10000; }
        var timeMeasurer = TimeMeasurer.CreateRunning();
        // Set a timer to invoke the callback if consent cannot be resolved after the given timeout
        var timeouted = false;
        var timer = setTimeout(function () {
            timeouted = true;
            Log.Warning("Timeout: Unable to resolve GDPR consent after " + timeout + "ms");
            callback(undefined);
        }, timeout);
        executeCommand(currentWindow, "getVendorConsents", [CRITEO_VENDOR_ID], function (vendorConsentData, success) {
            // If timeout has been reach we dont call the callback
            if (!timeouted) {
                // Clear timer to not invoke timeout callback
                clearTimeout(timer);
                Log.Debug("Consent retrieved in " + timeMeasurer.elapsed() + "ms");
                getVendorConsentsCallback(vendorConsentData, callback);
            }
        });
    }
    function getVendorConsentsCallback(vendorConsentsData, callback) {
        if (!vendorConsentsData) {
            Log.Warning("Unable to read GDPR consent data from CMP");
            callback(undefined);
        }
        else {
            var gdprConsent = {};
            if (typeof vendorConsentsData.metadata !== "undefined") {
                gdprConsent.consentData = vendorConsentsData.metadata;
            }
            if (typeof vendorConsentsData.gdprApplies !== "undefined") {
                gdprConsent.gdprApplies = !!(vendorConsentsData.gdprApplies);
            }
            if (vendorConsentsData.vendorConsents && typeof vendorConsentsData.vendorConsents[CRITEO_VENDOR_ID.toString()] !== "undefined") {
                gdprConsent.consentGiven = !!(vendorConsentsData.vendorConsents[CRITEO_VENDOR_ID.toString()]);
            }
            callback(gdprConsent);
        }
    }
    function executeCommand(currentWindow, command, parameter, callback) {
        // If cmp is not in the current window we post the request on the CMP frame
        if (!cmpInFrame(currentWindow)) {
            Log.Debug("No CMP defined on current frame");
            var cmpFrame_1 = getCMPFrame(currentWindow);
            // Set up a __cmp function to do the postMessage and stash the callback.
            // This function behaves (from the caller's perspective) identically to the in-frame __cmp call
            currentWindow.__cmp = function (cmpCommand, cmpParameter, cmpCallback) {
                if (!cmpFrame_1) {
                    Log.Warning("CMP not found");
                    return;
                }
                var callId = Math.random().toString(10);
                var request = {
                    __cmpCall: {
                        command: cmpCommand,
                        parameter: cmpParameter,
                        callId: callId
                    }
                };
                cmpCallbacks[callId] = callback;
                cmpFrame_1.postMessage(request, "*");
            };
            // When we get the return message, call the stashed callback
            currentWindow.addEventListener("message", function (event) {
                var json = typeof event.data === "string" ? tryParseJson(event.data) : event.data;
                if (json && json.__cmpReturn && json.__cmpReturn.callId && json.__cmpReturn.returnValue) {
                    var cmpReturn = json.__cmpReturn;
                    cmpCallbacks[cmpReturn.callId](cmpReturn.returnValue, cmpReturn.success);
                    delete cmpCallbacks[cmpReturn.callId];
                }
            }, false);
        }
        // Call the api
        currentWindow.__cmp(command, parameter, callback);
    }
    function cmpInFrame(currentWindow) {
        return typeof currentWindow.__cmp === "function";
    }
    function getCMPFrame(currentWindow) {
        var frame = currentWindow;
        var cmpFrame;
        // We try to find the CMP in at most 10 parent frames, that way we ensure we will not loop indefinitely (safeguard if frame === currentWindow.top is never true)
        for (var i = 0; i < 10; ++i) {
            try {
                if (frame.frames.__cmpLocator) {
                    cmpFrame = frame;
                }
            }
            catch (e) { }
            if (frame === currentWindow.top) {
                break;
            }
            frame = frame.parent;
        }
        return cmpFrame;
    }

    function tryGetLocalStorage(win) {
        try {
            return win.localStorage;
        }
        catch (e) {
            return undefined;
        }
    }
    var LocalStorageHelper = /** @class */ (function () {
        function LocalStorageHelper(customWindow) {
            this.EXPIRE_SUFFIX = "_expires";
            this.CHECK_STORAGE_KEY = "criteo_localstorage_check";
            this.localStorage = tryGetLocalStorage(customWindow || window);
        }
        // When localStorage is disabled, it is still present in the window object but will throw when used
        LocalStorageHelper.prototype.checkLocalStorage = function () {
            var key = this.CHECK_STORAGE_KEY;
            try {
                this.localStorage.setItem(key, key);
                this.localStorage.removeItem(key);
                return true;
            }
            catch (e) {
                return false;
            }
        };
        LocalStorageHelper.prototype.removeItem = function (key) {
            this.localStorage.removeItem(key);
            this.localStorage.removeItem(key + this.EXPIRE_SUFFIX);
        };
        LocalStorageHelper.prototype.getItem = function (key, maxExpiration) {
            var now = new Date().getTime();
            var expiresIn = this.localStorage.getItem(key + this.EXPIRE_SUFFIX);
            var expires = expiresIn ? parseInt(expiresIn, 10) : -1;
            var isExpired = expires !== -1 && expires < now;
            var tooLongExpiration = maxExpiration && (expires === -1 || expires - now > maxExpiration);
            if (isExpired || tooLongExpiration) {
                this.removeItem(key);
                return null;
            }
            return this.localStorage.getItem(key);
        };
        LocalStorageHelper.prototype.setItem = function (key, value, expires) {
            this.localStorage.setItem(key, value);
            if (expires) {
                var now = new Date().getTime();
                var schedule = now + expires;
                this.localStorage.setItem(key + this.EXPIRE_SUFFIX, schedule.toString());
            }
        };
        return LocalStorageHelper;
    }());

    var DirectBiddingSilentModeManager = /** @class */ (function () {
        function DirectBiddingSilentModeManager() {
            this.localStorageHelper = new LocalStorageHelper();
            this.localStorageEnabled = this.localStorageHelper.checkLocalStorage();
        }
        DirectBiddingSilentModeManager.prototype.silentModeEnabled = function () {
            var key = DirectBiddingSilentModeManager.SILENT_MODE_KEY;
            return this.localStorageEnabled && this.localStorageHelper.getItem(key) !== null;
        };
        DirectBiddingSilentModeManager.prototype.enableSilentMode = function (duration) {
            if (this.localStorageEnabled) {
                var key = DirectBiddingSilentModeManager.SILENT_MODE_KEY;
                var value = "1"; // The value is irrelevant, we rely on the expiration to know if silent mode is enabled
                this.localStorageHelper.setItem(key, value, duration);
            }
        };
        DirectBiddingSilentModeManager.SILENT_MODE_KEY = "criteo_silent_mode";
        return DirectBiddingSilentModeManager;
    }());

    var Size = /** @class */ (function () {
        function Size(width, height) {
            this.width = width;
            this.height = height;
        }
        Size.prototype.toString = function () {
            return this.width + "x" + this.height;
        };
        return Size;
    }());

    var BidStorageKey = /** @class */ (function () {
        function BidStorageKey() {
        }
        BidStorageKey.BID_STORAGE_KEY_PREFIX = "criteo_pt_cdb_bidcache";
        return BidStorageKey;
    }());

    var __extends = (undefined && undefined.__extends) || (function () {
        var extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    var BidStorageKeyWithSize = /** @class */ (function (_super) {
        __extends(BidStorageKeyWithSize, _super);
        function BidStorageKeyWithSize(size, networkId) {
            var _this = _super.call(this) || this;
            _this.size = size;
            _this.networkId = networkId;
            return _this;
        }
        BidStorageKeyWithSize.prototype.toString = function () {
            return BidStorageKey.BID_STORAGE_KEY_PREFIX + "_Size" + this.size + "_NetworkId" + this.networkId;
        };
        return BidStorageKeyWithSize;
    }(BidStorageKey));

    var __extends$1 = (undefined && undefined.__extends) || (function () {
        var extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    var BidStorageKeyWithZoneId = /** @class */ (function (_super) {
        __extends$1(BidStorageKeyWithZoneId, _super);
        function BidStorageKeyWithZoneId(zoneId) {
            var _this = _super.call(this) || this;
            _this.zoneId = zoneId;
            return _this;
        }
        BidStorageKeyWithZoneId.prototype.toString = function () {
            return BidStorageKey.BID_STORAGE_KEY_PREFIX + "_ZoneId" + this.zoneId;
        };
        return BidStorageKeyWithZoneId;
    }(BidStorageKey));

    var BidStorageKeyFactory = /** @class */ (function () {
        function BidStorageKeyFactory(useZoneIdIntegration, networkId) {
            this.useZoneIdIntegration = useZoneIdIntegration;
            this.networkId = networkId;
        }
        BidStorageKeyFactory.prototype.createKeysFromSlotRequest = function (slot) {
            if (this.useZoneIdIntegration) {
                return [new BidStorageKeyWithZoneId(slot.zoneId)];
            }
            else {
                var keys = [];
                for (var _i = 0, _a = slot.sizes; _i < _a.length; _i++) {
                    var size = _a[_i];
                    keys.push(new BidStorageKeyWithSize(size, this.networkId));
                }
                return keys;
            }
        };
        BidStorageKeyFactory.prototype.createKeyFromSlotResponse = function (slot) {
            if (this.useZoneIdIntegration) {
                return new BidStorageKeyWithZoneId(slot.zoneid);
            }
            else {
                return new BidStorageKeyWithSize(new Size(slot.width, slot.height), this.networkId);
            }
        };
        return BidStorageKeyFactory;
    }());

    var DirectBiddingBidManager = /** @class */ (function () {
        function DirectBiddingBidManager(useZoneIdIntegration, networkId) {
            this.localStorageHelper = new LocalStorageHelper();
            this.localStorageEnabled = this.localStorageHelper.checkLocalStorage();
            this.bidStorageKeyFactory = new BidStorageKeyFactory(useZoneIdIntegration, networkId);
        }
        DirectBiddingBidManager.useZoneIdIntegration = function (slots, networkId) {
            return networkId === undefined
                || slots.filter(function (slot) { return slot.sizes !== undefined && slot.sizes.length > 0; }).length === 0;
        };
        DirectBiddingBidManager.prototype.filterNoBidSlots = function (slots) {
            var ret = [];
            for (var _i = 0, slots_1 = slots; _i < slots_1.length; _i++) {
                var slot = slots_1[_i];
                var sizes = [];
                for (var _a = 0, _b = this.bidStorageKeyFactory.createKeysFromSlotRequest(slot); _a < _b.length; _a++) {
                    var key = _b[_a];
                    var bid = this.getBid(key, false);
                    if (bid !== DirectBiddingBidManager.NO_BID) {
                        if (key instanceof BidStorageKeyWithSize) {
                            sizes.push(key.size);
                        }
                        else {
                            ret.push(slot);
                        }
                    }
                }
                if (sizes.length > 0) {
                    slot.sizes = sizes;
                    ret.push(slot);
                }
            }
            return ret;
        };
        DirectBiddingBidManager.prototype.getRequestCachedBids = function (slots) {
            var cachedBids = [];
            for (var _i = 0, slots_2 = slots; _i < slots_2.length; _i++) {
                var slot = slots_2[_i];
                for (var _a = 0, _b = this.bidStorageKeyFactory.createKeysFromSlotRequest(slot); _a < _b.length; _a++) {
                    var key = _b[_a];
                    var bid = this.getBid(key);
                    if (bid !== undefined && bid !== DirectBiddingBidManager.NO_BID) {
                        cachedBids.push(bid);
                    }
                }
            }
            return cachedBids;
        };
        DirectBiddingBidManager.prototype.getBid = function (key, remove) {
            if (remove === void 0) { remove = true; }
            if (this.localStorageEnabled) {
                var value = this.localStorageHelper.getItem(key.toString());
                if (remove && value !== DirectBiddingBidManager.NO_BID) { // "No bid" should not be removed manually and should wait for expiration
                    this.localStorageHelper.removeItem(key.toString());
                }
                return value ? tryParseJson(value) : undefined;
            }
            return undefined;
        };
        DirectBiddingBidManager.prototype.storeRequestNoBid = function (slot, bidCacheDurationSeconds) {
            for (var _i = 0, _a = this.bidStorageKeyFactory.createKeysFromSlotRequest(slot); _i < _a.length; _i++) {
                var key = _a[_i];
                this.storeNoBid(key, bidCacheDurationSeconds);
            }
        };
        DirectBiddingBidManager.prototype.storeResponseBid = function (slot, bidCacheDurationSeconds) {
            var key = this.bidStorageKeyFactory.createKeyFromSlotResponse(slot);
            this.storeBid(key, slot, bidCacheDurationSeconds);
        };
        DirectBiddingBidManager.prototype.storeNoBid = function (bidStorageKey, storageDurationInSeconds) {
            this.storeBid(bidStorageKey, DirectBiddingBidManager.NO_BID, storageDurationInSeconds);
        };
        DirectBiddingBidManager.prototype.storeBid = function (bidStorageKey, bid, storageDurationInSeconds) {
            if (this.localStorageEnabled) {
                this.localStorageHelper.setItem(bidStorageKey.toString(), JSON.stringify(bid), storageDurationInSeconds * 1000);
            }
        };
        DirectBiddingBidManager.NO_BID = "nobid";
        return DirectBiddingBidManager;
    }());

    var DirectBiddingCache = /** @class */ (function () {
        function DirectBiddingCache(slots, networkId) {
            var useZoneIdIntegration = DirectBiddingBidManager.useZoneIdIntegration(slots, networkId);
            this.bidManager = new DirectBiddingBidManager(useZoneIdIntegration, networkId);
            this.silentModeManager = new DirectBiddingSilentModeManager();
        }
        DirectBiddingCache.prototype.filterNoBidSlots = function (slots) {
            return this.bidManager.filterNoBidSlots(slots);
        };
        DirectBiddingCache.prototype.silentModeEnabled = function () {
            return this.silentModeManager.silentModeEnabled();
        };
        DirectBiddingCache.prototype.getCachedBids = function (slots) {
            return this.bidManager.getRequestCachedBids(slots);
        };
        DirectBiddingCache.prototype.handleResponse = function (requestSlots, response, extraData, timeouted) {
            // Save the global user "blacklist" flag
            var globalTtl = extraData.time_to_next_call;
            if (globalTtl > 0) {
                Log.Debug("Global silent mode enabled for " + globalTtl + " seconds");
                this.silentModeManager.enableSilentMode(globalTtl * 1000);
            }
            // Generate the slot -> ttl array
            var ttls = {};
            if (extraData.slots) {
                for (var _i = 0, _a = extraData.slots; _i < _a.length; _i++) {
                    var slot = _a[_i];
                    if (slot.ttl) {
                        ttls[slot.ad_unit_id] = slot.ttl;
                    }
                }
            }
            // Store the response in cache if we replied too late and bid caching is enabled
            var bidCacheDuration = extraData.bidcachedurationseconds;
            if (response.slots) {
                for (var _b = 0, _c = response.slots; _b < _c.length; _b++) {
                    var slot = _c[_b];
                    var ttl = bidCacheDuration;
                    if (slot.impid in ttls) {
                        ttl = ttls[slot.impid];
                        delete ttls[slot.impid];
                    }
                    if (timeouted && ttl > 0) {
                        Log.Debug("Post-timeout bid for slot '" + slot.impid + "' cached for " + ttl + " seconds");
                        this.bidManager.storeResponseBid(slot, ttl);
                    }
                }
            }
            // TTLs which do not have a corresponding bid are "no bids" that should be stored
            for (var impid in ttls) {
                for (var _d = 0, requestSlots_1 = requestSlots; _d < requestSlots_1.length; _d++) {
                    var slot = requestSlots_1[_d];
                    if (slot.impId === impid) {
                        var ttl = ttls[impid];
                        Log.Debug("Silent mode for slot '" + slot.impId + "' enabled for " + ttl + " seconds");
                        this.bidManager.storeRequestNoBid(slot, ttl);
                    }
                }
            }
        };
        return DirectBiddingCache;
    }());

    var DirectBiddingMetricsManager = /** @class */ (function () {
        function DirectBiddingMetricsManager() {
            this.localStorageHelper = new LocalStorageHelper();
            this.localStorageEnabled = this.localStorageHelper.checkLocalStorage();
        }
        DirectBiddingMetricsManager.prototype.getMetrics = function (clear) {
            if (this.localStorageEnabled) {
                var key = DirectBiddingMetricsManager.METRICS_STORAGE_KEY;
                var value = this.localStorageHelper.getItem(key);
                var metrics = value ? tryParseJson(value) : [];
                if (clear) {
                    this.localStorageHelper.removeItem(key);
                }
                return metrics;
            }
            return [];
        };
        DirectBiddingMetricsManager.prototype.setMetrics = function (metrics) {
            if (this.localStorageEnabled) {
                var key = DirectBiddingMetricsManager.METRICS_STORAGE_KEY;
                this.localStorageHelper.setItem(key, JSON.stringify(metrics), 60 * 60 * 1000); // Store with a 1h lifetime
            }
        };
        DirectBiddingMetricsManager.prototype.storeMetric = function (metric) {
            if (this.localStorageEnabled) {
                var key = DirectBiddingMetricsManager.METRICS_STORAGE_KEY;
                var oldValue = this.localStorageHelper.getItem(key);
                var metrics = oldValue ? tryParseJson(oldValue) : [];
                metrics.push(metric);
                this.setMetrics(metrics);
            }
        };
        DirectBiddingMetricsManager.METRICS_STORAGE_KEY = "criteo_pt_cdb_metrics";
        return DirectBiddingMetricsManager;
    }());

    var DirectBiddingRequestBuilder = /** @class */ (function () {
        function DirectBiddingRequestBuilder(slots, context, metricsManager, urlBuilder, profileId, integrationMode, networkId, adapterVersion, gdprConsent) {
            this.slots = slots;
            this.context = context;
            this.metricsManager = metricsManager;
            this.urlBuilder = urlBuilder;
            this.profileId = profileId;
            this.integrationMode = integrationMode;
            this.networkId = networkId;
            this.adapterVersion = adapterVersion;
            this.gdprConsent = gdprConsent;
        }
        DirectBiddingRequestBuilder.prototype.isValid = function () {
            return this.slots.length > 0;
        };
        DirectBiddingRequestBuilder.prototype.getRequest = function () {
            var formattedSlots = [];
            for (var _i = 0, _a = this.slots; _i < _a.length; _i++) {
                var slot = _a[_i];
                var formattedSlot = {
                    impid: slot.impId
                };
                if (slot.zoneId !== undefined) {
                    formattedSlot.zoneid = slot.zoneId;
                }
                if (slot.nativeCallback !== undefined) {
                    formattedSlot.native = true;
                }
                if (slot.transactionId !== undefined) {
                    formattedSlot.transactionid = slot.transactionId;
                }
                if (slot.publisherSubId !== undefined) {
                    formattedSlot.publishersubid = slot.publisherSubId;
                }
                if (slot.sizes !== undefined) {
                    var sizesStringArray = [];
                    for (var _b = 0, _c = slot.sizes; _b < _c.length; _b++) {
                        var size = _c[_b];
                        sizesStringArray.push(size.width + "x" + size.height); // TODO: use Size.toString()
                    }
                    formattedSlot.sizes = sizesStringArray;
                }
                formattedSlots.push(formattedSlot);
            }
            var request = {
                publisher: {
                    url: this.context.highestAccessibleUrl
                },
                slots: formattedSlots
            };
            if (this.networkId !== undefined) {
                request.publisher.networkid = this.networkId;
            }
            var metrics = this.metricsManager.getMetrics(true);
            if (metrics.length) {
                request.previousBidFeedback = metrics;
            }
            if (this.gdprConsent) {
                request.gdprConsent = this.gdprConsent;
            }
            return request;
        };
        DirectBiddingRequestBuilder.prototype.getUrl = function () {
            return this.urlBuilder.buildUrl(this.profileId, this.context, this.integrationMode, this.adapterVersion);
        };
        return DirectBiddingRequestBuilder;
    }());

    // Extract generated impression ids and bidCacheDurationSeconds from extra data and remove extra data node if existing
    function extractExtraData(response) {
        var ret = {
            slots: undefined,
            bidcachedurationseconds: 0,
            time_to_next_call: 0
        };
        if (response.exd !== undefined) {
            if (response.exd.bidcachedurationseconds !== undefined) {
                ret.bidcachedurationseconds = response.exd.bidcachedurationseconds;
            }
            if (response.exd.time_to_next_call !== undefined) {
                ret.time_to_next_call = response.exd.time_to_next_call;
            }
            ret.slots = response.exd.slots;
            // In case of no bid, json given to callback has to be empty. As the extra data node is always present, we
            // need to remove it before calling callback.
            delete response.exd;
        }
        return ret;
    }

    var DirectBiddingSlot = /** @class */ (function () {
        function DirectBiddingSlot(impid, zoneid, nativeCallback, transactionId, sizes, publisherSubId) {
            this.impId = impid;
            this.zoneId = zoneid;
            this.nativeCallback = nativeCallback;
            this.transactionId = transactionId;
            this.sizes = sizes;
            this.publisherSubId = publisherSubId;
        }
        return DirectBiddingSlot;
    }());

    function getPreciseRequestDuration(url) {
        if (!window.performance || !window.performance.getEntries) {
            return undefined;
        }
        var entries = window.performance.getEntries();
        for (var i = entries.length - 1; i >= 0; --i) {
            var entry = entries[i];
            if (entry.name === url && entry.duration) {
                return Math.round(entry.duration);
            }
        }
        return undefined;
    }

    var DirectBiddingMetric = /** @class */ (function () {
        function DirectBiddingMetric(impressionId, elapsed, isTimeout, pageLoadElapsed, adapterStartElapsed, cdbCallStartElapsed, cdbCallEndElapsed, setTargetingElapsed, adapterEndElapsed, adapterTimeout, adapterIsTimeout, zoneId, adUnitId) {
            this.impressionId = impressionId;
            this.elapsed = elapsed;
            this.isTimeout = isTimeout;
            this.pageLoadElapsed = pageLoadElapsed;
            this.adapterStartElapsed = adapterStartElapsed;
            this.cdbCallStartElapsed = cdbCallStartElapsed;
            this.cdbCallEndElapsed = cdbCallEndElapsed;
            this.setTargetingElapsed = setTargetingElapsed;
            this.adapterEndElapsed = adapterEndElapsed;
            this.adapterTimeout = adapterTimeout;
            this.adapterIsTimeout = adapterIsTimeout;
            this.zoneId = zoneId;
            this.adUnitId = adUnitId;
        }
        return DirectBiddingMetric;
    }());

    var DirectBiddingMetricBuilder = /** @class */ (function () {
        function DirectBiddingMetricBuilder() {
            this.elapsed = 0;
            this.isTimeout = false;
            this.pageLoadElapsed = 0;
            this.adapterStartElapsed = 0;
            this.cdbCallStartElapsed = 0;
            this.cdbCallEndElapsed = 0;
            this.setTargetingElapsed = 0;
            this.adapterEndElapsed = 0;
        }
        DirectBiddingMetricBuilder.prototype.withElapsed = function (elapsed) {
            this.elapsed = elapsed;
            return this;
        };
        DirectBiddingMetricBuilder.prototype.withIsTimeout = function (isTimeout) {
            this.isTimeout = isTimeout;
            return this;
        };
        DirectBiddingMetricBuilder.prototype.withPageLoadElapsed = function (pageLoadElapsed) {
            this.pageLoadElapsed = pageLoadElapsed;
            return this;
        };
        DirectBiddingMetricBuilder.prototype.withAdapterStartElapsed = function (adapterStartElapsed) {
            this.adapterStartElapsed = adapterStartElapsed;
            return this;
        };
        DirectBiddingMetricBuilder.prototype.withCdbCallStartElapsed = function (cdbCallStartElapsed) {
            this.cdbCallStartElapsed = cdbCallStartElapsed;
            return this;
        };
        DirectBiddingMetricBuilder.prototype.withCdbCallEndElapsed = function (cdbCallEndElapsed) {
            this.cdbCallEndElapsed = cdbCallEndElapsed;
            return this;
        };
        DirectBiddingMetricBuilder.prototype.withSetTargetingElapsed = function (setTargetingElapsed) {
            this.setTargetingElapsed = setTargetingElapsed;
            return this;
        };
        DirectBiddingMetricBuilder.prototype.withAdapterEndElapsed = function (adapterEndElapsed) {
            this.adapterEndElapsed = adapterEndElapsed;
            return this;
        };
        DirectBiddingMetricBuilder.prototype.withAdapterTimeout = function (adapterTimeout) {
            this.adapterTimeout = adapterTimeout;
            return this;
        };
        DirectBiddingMetricBuilder.prototype.withZoneId = function (zoneId) {
            this.zoneId = zoneId;
            return this;
        };
        DirectBiddingMetricBuilder.prototype.withAdUnitId = function (adUnitId) {
            this.adUnitId = adUnitId;
            return this;
        };
        DirectBiddingMetricBuilder.prototype.build = function (impressionId) {
            var adapterIsTimeout;
            if (this.adapterTimeout !== undefined) {
                adapterIsTimeout = this.adapterEndElapsed > this.adapterTimeout;
            }
            return new DirectBiddingMetric(impressionId, this.elapsed, this.isTimeout, this.pageLoadElapsed, this.adapterStartElapsed, this.cdbCallStartElapsed, this.cdbCallEndElapsed, this.setTargetingElapsed, this.adapterEndElapsed, this.adapterTimeout, adapterIsTimeout, this.zoneId, this.adUnitId);
        };
        return DirectBiddingMetricBuilder;
    }());

    var DirectBiddingTimer = /** @class */ (function () {
        function DirectBiddingTimer(auctionStart, timeout) {
            this.hasSetTargetingBeenCalled = false;
            this.builder = new DirectBiddingMetricBuilder();
            this.timer = auctionStart !== undefined
                ? TimeMeasurer.CreateWithStartTime(auctionStart)
                : TimeMeasurer.CreateRunning();
            var adapterStartElapsed = this.timer.elapsed();
            this.builder.withAdapterStartElapsed(adapterStartElapsed);
            this.builder.withPageLoadElapsed(TimeMeasurer.TimeSincePageLoad() - adapterStartElapsed);
            if (timeout !== undefined) {
                this.builder.withAdapterTimeout(timeout);
            }
        }
        DirectBiddingTimer.prototype.sendRequest = function (url) {
            this.url = url;
            this.sendTime = TimeMeasurer.CreateRunning();
            this.builder.withCdbCallStartElapsed(this.timer.elapsed());
        };
        DirectBiddingTimer.prototype.requestReceived = function (timeout) {
            if (timeout === void 0) { timeout = false; }
            this.builder.withElapsed(getPreciseRequestDuration(this.url) || this.sendTime.elapsed());
            this.builder.withCdbCallEndElapsed(this.timer.elapsed());
            this.builder.withIsTimeout(timeout);
        };
        DirectBiddingTimer.prototype.setTargeting = function () {
            // We only want to keep the first value as the goal is to detect the global_timeout. If we took the second
            // call to setTargeting, it may happen after the Prebid_Timeout.
            if (!this.hasSetTargetingBeenCalled) {
                this.builder.withSetTargetingElapsed(this.timer.elapsed());
                this.hasSetTargetingBeenCalled = true;
            }
        };
        DirectBiddingTimer.prototype.finish = function (metricsManager, slots) {
            this.builder.withAdapterEndElapsed(this.timer.elapsed());
            if (!slots || slots.length === 0) {
                slots = [{ imp_id: "" }];
            }
            for (var _i = 0, slots_1 = slots; _i < slots_1.length; _i++) {
                var slot = slots_1[_i];
                this.builder.withZoneId(slot.zone_id);
                this.builder.withAdUnitId(slot.ad_unit_id);
                metricsManager.storeMetric(this.builder.build(slot.imp_id));
            }
        };
        return DirectBiddingTimer;
    }());

    var CacheBusterGenerator = /** @class */ (function () {
        function CacheBusterGenerator() {
        }
        CacheBusterGenerator.generateCacheBuster = function () {
            return Math.floor(Math.random() * 99999999999);
        };
        return CacheBusterGenerator;
    }());

    var IntegrationMode;
    (function (IntegrationMode) {
        IntegrationMode[IntegrationMode["Unspecified"] = 0] = "Unspecified";
        IntegrationMode[IntegrationMode["AMP"] = 1] = "AMP";
    })(IntegrationMode || (IntegrationMode = {}));
    function parse(value) {
        switch (value.toLowerCase()) {
            case "amp":
                return IntegrationMode.AMP;
            default:
                return IntegrationMode.Unspecified;
        }
    }

    var PublisherTagVersion = 51;

    var DirectBiddingUrlBuilder = /** @class */ (function () {
        function DirectBiddingUrlBuilder(auditMode) {
            if (auditMode === void 0) { auditMode = false; }
            this.auditMode = auditMode;
        }
        DirectBiddingUrlBuilder.prototype.buildUrl = function (profileId, context, integrationMode, adapterVersion) {
            if (integrationMode === void 0) { integrationMode = IntegrationMode.Unspecified; }
            // protocol
            var protocol = context.protocol === "https:" ? "https:" : "http:";
            // base url
            var biddingUrl = protocol + DirectBiddingUrlBuilder.CRITEO_BIDDER_URL + this.getHandlerPath();
            // publishertag version
            biddingUrl += "?ptv=" + PublisherTagVersion;
            // profileId
            biddingUrl += "&profileId=" + String(profileId);
            // forward the copy of the criteo uid saved on publisher domain
            biddingUrl += context.ctoIdOnPublisherDomain ? "&idcpy=" + context.ctoIdOnPublisherDomain : "";
            // forward the criteo idfs saved on publisher domain
            biddingUrl += context.idfs ? "&idfs=" + context.idfs : "";
            // forward the criteo secureId saved on publisher domain
            biddingUrl += context.secureId ? "&sid=" + context.secureId : "";
            // forward the optout status saved on publisher domain
            biddingUrl += context.isOptOut ? "&optout=1" : "";
            // track integration mode if different from standard mode
            if (integrationMode !== IntegrationMode.Unspecified) {
                biddingUrl += "&im=" + (integrationMode);
            }
            if (adapterVersion !== undefined) {
                biddingUrl += "&av=" + String(adapterVersion);
            }
            // random number
            biddingUrl += "&cb=" + String(CacheBusterGenerator.generateCacheBuster());
            // context flags
            biddingUrl += context.getContextFlags();
            return biddingUrl;
        };
        DirectBiddingUrlBuilder.prototype.getHandlerPath = function () {
            if (this.auditMode) {
                return DirectBiddingUrlBuilder.CRITEO_BIDDER_AUDIT_HANDLER;
            }
            return DirectBiddingUrlBuilder.CRITEO_BIDDER_HANDLER;
        };
        DirectBiddingUrlBuilder.CRITEO_BIDDER_URL = "//bidder.criteo.com/";
        DirectBiddingUrlBuilder.CRITEO_BIDDER_HANDLER = "cdb";
        DirectBiddingUrlBuilder.CRITEO_BIDDER_AUDIT_HANDLER = "prebid/audit";
        return DirectBiddingUrlBuilder;
    }());

    // TODO: the timeout given in the request may not be the effective timeout defined in PREBID_TIMEOUT because of a bug
    // in prebid (m.bordin will raise this issue to prebid)
    // Until it is fixed we should consider the timeout with the lower value if the two are provided
    function resolvePrebidTimeout(requestTimeout) {
        var prebidTimeout = typeof window.PREBID_TIMEOUT === "number" && window.PREBID_TIMEOUT;
        if (requestTimeout && prebidTimeout) {
            return Math.min(requestTimeout, prebidTimeout);
        }
        else {
            return requestTimeout || prebidTimeout || undefined;
        }
    }

    var Prebid = /** @class */ (function () {
        function Prebid(profileId, adapterVersion, bidRequests, bidderRequest) {
            this.timer = new DirectBiddingTimer(bidderRequest.auctionStart, resolvePrebidTimeout(bidderRequest.timeout));
            this.auctionId = bidderRequest.auctionId;
            this.bidRequests = bidRequests;
            this.slots = [];
            var networkId;
            var integrationMode;
            for (var _i = 0, bidRequests_1 = bidRequests; _i < bidRequests_1.length; _i++) {
                var bidRequest = bidRequests_1[_i];
                this.slots.push(new DirectBiddingSlot(bidRequest.adUnitCode, bidRequest.params.zoneId, bidRequest.params.nativeCallback, bidRequest.transactionId, bidRequest.sizes.map(function (size) { return new Size(size[0], size[1]); }), bidRequest.params.publisherSubId));
                networkId = bidRequest.params.networkId || networkId;
                if (bidRequest.params.integrationMode) {
                    integrationMode = parse(bidRequest.params.integrationMode);
                }
            }
            var gdprConsent = {};
            if (bidderRequest.gdprConsent) {
                if (typeof bidderRequest.gdprConsent.consentString !== "undefined") {
                    gdprConsent.consentData = bidderRequest.gdprConsent.consentString;
                }
                if (typeof bidderRequest.gdprConsent.gdprApplies !== "undefined") {
                    gdprConsent.gdprApplies = !!(bidderRequest.gdprConsent.gdprApplies);
                }
                if (bidderRequest.gdprConsent.vendorData && bidderRequest.gdprConsent.vendorData.vendorConsents
                    && typeof bidderRequest.gdprConsent.vendorData.vendorConsents[CRITEO_VENDOR_ID.toString(10)] !== "undefined") {
                    gdprConsent.consentGiven = !!(bidderRequest.gdprConsent.vendorData.vendorConsents[CRITEO_VENDOR_ID.toString(10)]);
                }
            }
            this.metricsManager = new DirectBiddingMetricsManager();
            this.cache = new DirectBiddingCache(this.slots, networkId);
            this.requestBuilder = new DirectBiddingRequestBuilder(this.cache.filterNoBidSlots(this.slots), window.criteo_pubtag.context, this.metricsManager, new DirectBiddingUrlBuilder(), profileId, integrationMode, networkId, adapterVersion, gdprConsent);
            this.url = this.requestBuilder.getUrl();
            window.Criteo.prebid_adapters = window.Criteo.prebid_adapters || {};
            window.Criteo.prebid_adapters[this.auctionId] = this;
        }
        Prebid.prototype.buildCdbUrl = function () {
            return this.url;
        };
        Prebid.prototype.buildCdbRequest = function () {
            if (this.cache.silentModeEnabled()) {
                Log.Debug("Request ignored because the global silent mode is enabled");
                return undefined;
            }
            this.timer.sendRequest(this.url);
            return this.requestBuilder.getRequest();
        };
        Prebid.GetAllAdapters = function () {
            return window.Criteo.prebid_adapters;
        };
        Prebid.GetAdapter = function (request) {
            var auctionId = typeof request === "string" ? request : request.bidRequests[0].auctionId;
            var adapters = Prebid.GetAllAdapters();
            if (adapters && auctionId in adapters) {
                return adapters[auctionId];
            }
            return undefined;
        };
        Prebid.prototype.createNativeAd = function (id, payload, callback) {
            // Store the callback and payload in a global object to be later accessed from the creative
            window.criteo_prebid_native_slots = window.criteo_prebid_native_slots || {};
            window.criteo_prebid_native_slots[id] = { callback: callback, payload: payload };
            // The creative is in an iframe so we have to get the callback and payload
            // from the parent window (doesn't work with safeframes)
            return "<script type=\"text/javascript\">\n            var win = window;\n            for (var i = 0; i < 10; ++i) {\n                win = win.parent;\n                if (win.criteo_prebid_native_slots) {\n                    var responseSlot = win.criteo_prebid_native_slots[\"" + id + "\"];\n                    responseSlot.callback(responseSlot.payload);\n                    break;\n                }\n            }\n        </script>";
        };
        Prebid.prototype.getBidRequestForSlot = function (slot) {
            for (var _i = 0, _a = this.bidRequests; _i < _a.length; _i++) {
                var request = _a[_i];
                if (request.adUnitCode === slot.impid && (!request.params.zoneId || parseInt(request.params.zoneId, 10) === slot.zoneid)) {
                    return request;
                }
            }
            return undefined;
        };
        Prebid.prototype.interpretResponse = function (response, request) {
            this.timer.requestReceived();
            var extraData = extractExtraData(response);
            var slotsMap = {};
            if (extraData.slots !== undefined) {
                for (var _i = 0, _a = extraData.slots; _i < _a.length; _i++) {
                    var slot = _a[_i];
                    slotsMap[slot.ad_unit_id] = slot;
                }
            }
            var bids = [];
            if (response.slots && Array.isArray(response.slots)) {
                for (var _b = 0, _c = response.slots; _b < _c.length; _b++) {
                    var slot = _c[_b];
                    var bidRequest = this.getBidRequestForSlot(slot);
                    var bidId = bidRequest.bidId;
                    var creative = slot.native
                        ? this.createNativeAd(bidId, slot.native, bidRequest.params.nativeCallback)
                        : slot.creative;
                    var ttl = slot.ttl
                        || (slotsMap[slot.impid] && slotsMap[slot.impid].ttl)
                        || 60;
                    bids.push({
                        requestId: bidId,
                        cpm: slot.cpm,
                        ad: creative,
                        currency: slot.currency,
                        netRevenue: true,
                        ttl: ttl,
                        creativeId: bidId,
                        width: slot.width,
                        height: slot.height
                    });
                }
            }
            this.cache.handleResponse(this.slots, response, extraData, false);
            this.timer.finish(this.metricsManager, extraData.slots);
            return bids;
        };
        Prebid.prototype.handleBidWon = function (bid) {
            var metrics = this.metricsManager.getMetrics(false);
            for (var i in metrics) {
                if (metrics[i].adUnitId === bid.adUnitCode) {
                    metrics[i].adapterBidWon = true;
                }
            }
            this.metricsManager.setMetrics(metrics);
        };
        Prebid.prototype.handleBidTimeout = function () {
            this.timer.requestReceived(true);
            this.timer.finish(this.metricsManager);
        };
        Prebid.prototype.handleSetTargeting = function () {
            this.timer.setTargeting();
        };
        return Prebid;
    }());

    // generic event
    // other events inherits from this one
    var AbstractEvent = /** @class */ (function () {
        function AbstractEvent(e) {
            this.name = e;
        }
        AbstractEvent.prototype.eval = function (publishertag) {
            return;
        };
        return AbstractEvent;
    }());

    var AsyncRequest = /** @class */ (function () {
        function AsyncRequest(url, data, contentType, withCredentials) {
            if (withCredentials === void 0) { withCredentials = true; }
            this.url = url;
            this.data = data;
            this.contentType = contentType;
            this.withCredentials = withCredentials;
        }
        AsyncRequest.prototype.send = function (onSuccess, onError, onTimeout, timeout) {
            var method = this.data !== undefined ? "POST" : "GET";
            var xmlHttpRequest = this.getXMLHttpRequest(method, onSuccess, onError, onTimeout, timeout);
            if (xmlHttpRequest !== undefined) {
                xmlHttpRequest.send(this.data);
            }
            else {
                var xDomainRequest = this.getXDomainRequest(method, onSuccess, onError, onTimeout, timeout);
                if (xDomainRequest !== undefined) {
                    xDomainRequest.send(this.data);
                }
            }
        };
        AsyncRequest.prototype.getXMLHttpRequest = function (method, onSuccess, onError, onTimeout, timeout) {
            var request = new XMLHttpRequest();
            if ("withCredentials" in request) {
                request.open(method, this.url, true);
                request.timeout = timeout ? timeout : AsyncRequest.LOCAL_PASSBACK_TIMEOUT;
                if (this.contentType) {
                    request.setRequestHeader("Content-type", this.contentType);
                }
                else {
                    if (method === "POST") {
                        request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                    }
                }
                request.withCredentials = this.withCredentials;
                request.onload = function () {
                    if (request.readyState === 4 && request.status === 200) {
                        onSuccess(request.responseText);
                    }
                    else {
                        onError(request.readyState, request.status);
                    }
                };
                request.onerror = function () {
                    onError(undefined, undefined);
                };
                request.ontimeout = onTimeout;
            }
            else {
                return undefined;
            }
            return request;
        };
        AsyncRequest.prototype.getXDomainRequest = function (method, onSuccess, onError, onTimeout, timeout) {
            if (typeof XDomainRequest !== "undefined") {
                var request_1 = new XDomainRequest();
                request_1.timeout = timeout ? timeout : AsyncRequest.LOCAL_PASSBACK_TIMEOUT;
                request_1.open(method, this.url);
                request_1.onload = function () {
                    if (request_1.responseText !== undefined) {
                        onSuccess(request_1.responseText);
                    }
                    else {
                        onError(undefined, undefined);
                    }
                };
                if (request_1.onerror) {
                    request_1.onerror = function () {
                        onError(undefined, undefined);
                    };
                }
                // ontimeout event does not exist for ie8
                if (request_1.ontimeout) {
                    request_1.ontimeout = onTimeout;
                }
                return request_1;
            }
            else {
                return undefined;
            }
        };
        AsyncRequest.LOCAL_PASSBACK_TIMEOUT = 30000;
        return AsyncRequest;
    }());

    var __extends$2 = (undefined && undefined.__extends) || (function () {
        var extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    // an event to trigger a direct bidding request
    var DirectBiddingEvent = /** @class */ (function (_super) {
        __extends$2(DirectBiddingEvent, _super);
        function DirectBiddingEvent(profileId, urlBuilder, slots, callbackSuccess, callbackError, callbackTimeout, timeout, networkId, integrationMode, adapterVersion) {
            var _this = _super.call(this, DirectBiddingEvent.NAME) || this;
            _this.profileId = profileId;
            _this.urlBuilder = urlBuilder;
            _this.slots = slots;
            _this.metricsManager = new DirectBiddingMetricsManager();
            _this.callbackSuccess = callbackSuccess;
            _this.callbackError = callbackError;
            _this.callbackTimeout = callbackTimeout;
            _this.timeout = timeout;
            _this.networkId = networkId;
            _this.integrationMode = integrationMode;
            _this.adapterVersion = adapterVersion;
            return _this;
        }
        DirectBiddingEvent.prototype.setGDPRConsent = function (gdprConsent) {
            this.gdprConsent = gdprConsent;
        };
        DirectBiddingEvent.prototype.eval = function (publishertag) {
            var bidRequest = DirectBiddingEvent.getCriteoAdapterBidRequest();
            var auctionStart = DirectBiddingEvent.getRequestAuctionStart(bidRequest);
            var timeout = resolvePrebidTimeout(bidRequest && bidRequest.timeout);
            this.evalWithTimeout(publishertag, timeout, auctionStart);
        };
        DirectBiddingEvent.prototype.evalWithTimeout = function (publishertag, timeout, auctionStart) {
            var _this = this;
            var timer = new DirectBiddingTimer(auctionStart, timeout);
            var requestBuilder = new DirectBiddingRequestBuilder(this.slots, publishertag.context, this.metricsManager, this.urlBuilder, this.profileId, this.integrationMode, this.networkId, this.adapterVersion, this.gdprConsent);
            if (!requestBuilder.isValid() || typeof JSON === "undefined") {
                this.callbackError(undefined, undefined);
                return;
            }
            var auctionRequest = requestBuilder.getRequest();
            var auctionRequestJSON = JSON.stringify(auctionRequest);
            var url = requestBuilder.getUrl();
            var request = new AsyncRequest(url, auctionRequestJSON, "application/x-www-form-urlencoded");
            timer.sendRequest(url);
            request.send(function (response) {
                timer.requestReceived();
                var responseObject = tryParseJson(response) || {};
                var extraData = extractExtraData(responseObject);
                if (_this.callbackSuccess !== undefined) {
                    _this.callbackSuccess(JSON.stringify(responseObject), extraData);
                }
                // Once adapter callback is called we consider adapter has ended
                timer.finish(_this.metricsManager, extraData.slots);
            }, function (readyState, status) {
                timer.requestReceived();
                // Dont call error callback if success callback has been called with a cached response
                if (_this.callbackError !== undefined) {
                    _this.callbackError(readyState, status);
                }
                // Once adapter callback is called we consider adapter has ended
                timer.finish(_this.metricsManager);
            }, function () {
                timer.requestReceived(true);
                // Dont call timeout callback if success callback has been called with a cached response
                if (_this.callbackTimeout !== undefined) {
                    _this.callbackTimeout();
                }
                // Once adapter callback is called we consider adapter has ended
                timer.finish(_this.metricsManager);
            }, this.timeout);
            return;
        };
        /*
         * In standalone integration returns undefined
         * In prebid integration returns the bid request send by prebid to criteo adapter (bidderCode specifed is the one
         * of Criteo in its adapter)
         */
        DirectBiddingEvent.getCriteoAdapterBidRequest = function () {
            try {
                return window.pbjs._bidsRequested.find(function (request) { return request.bidderCode === "criteo"; });
            }
            catch (error) {
                return undefined;
            }
        };
        DirectBiddingEvent.getRequestAuctionStart = function (bidder) {
            return bidder && bidder.auctionStart;
        };
        DirectBiddingEvent.NAME = "directbidding";
        return DirectBiddingEvent;
    }(AbstractEvent));

    var __extends$3 = (undefined && undefined.__extends) || (function () {
        var extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    var DirectBiddingEventWithCaching = /** @class */ (function (_super) {
        __extends$3(DirectBiddingEventWithCaching, _super);
        function DirectBiddingEventWithCaching(profileId, urlBuilder, slots, callbackSuccess, callbackError, callbackTimeout, timeout, networkId, integrationMode, adapterVersion) {
            if (timeout === void 0) { timeout = 3000; }
            var _this = _super.call(this, DirectBiddingEventWithCaching.NAME) || this;
            // Client timeout is handled below, so we give the browser 10 times more time to complete the bid in order to
            // be able to cache it if necessary
            // We use a minimum of 3s because some timeouts are calculated by the publisher and might be negative
            var httpTimeout = Math.max(timeout * 10, 3000);
            _this.cache = new DirectBiddingCache(slots, networkId);
            _this.directBiddingEvent = new DirectBiddingEvent(profileId, urlBuilder, _this.cache.filterNoBidSlots(slots), function (bidReponse, extraData) { return _this.onSuccess(bidReponse, extraData); }, function (readyState, status) { return _this.onError(readyState, status); }, function () { return _this.onHttpTimeout(); }, httpTimeout, networkId, integrationMode, adapterVersion);
            _this.slots = slots;
            _this.callbackSuccess = callbackSuccess;
            _this.callbackError = callbackError;
            _this.callbackTimeout = callbackTimeout;
            _this.timeout = timeout;
            _this.hasTimeouted = false;
            _this.hasResponded = false;
            return _this;
        }
        DirectBiddingEventWithCaching.prototype.eval = function (publishertag) {
            var _this = this;
            if (!hasCMP(window)) {
                this.evalWithCmp(publishertag, undefined);
            }
            else {
                retrieveGDPRConsent(window, function (consent) {
                    _this.evalWithCmp(publishertag, consent);
                });
            }
        };
        DirectBiddingEventWithCaching.prototype.evalWithCmp = function (publishertag, gdprConsent) {
            var _this = this;
            setTimeout(function () { return _this.onTimeout(); }, this.timeout);
            if (this.cache.silentModeEnabled()) {
                Log.Debug("Request ignored because the global silent mode is enabled");
                this.callbackSuccess("", undefined);
                return;
            }
            this.directBiddingEvent.setGDPRConsent(gdprConsent);
            this.directBiddingEvent.evalWithTimeout(publishertag, this.timeout);
        };
        /**
         * Handle the bid response.
         * If the timeout has not been handled yet it will call the success callback.
         * Else, if a timeout occurred and bid caching is enabled, it will cache the bid response.
         */
        DirectBiddingEventWithCaching.prototype.onSuccess = function (bidResponse, extraData) {
            this.hasResponded = true;
            if (extraData !== undefined) {
                var response = JSON.parse(bidResponse);
                this.cache.handleResponse(this.slots, response, extraData, this.hasTimeouted);
            }
            // If we did no timeout, perform as usual
            if (!this.hasTimeouted) {
                this.callbackSuccess(bidResponse, extraData);
            }
        };
        /**
         * Handle network errors.
         */
        DirectBiddingEventWithCaching.prototype.onError = function (readyState, status) {
            this.hasResponded = true;
            // If we did no timeout, perform as usual
            if (!this.hasTimeouted) {
                this.callbackError(readyState, status);
            }
        };
        /**
         * Handle the HTTP timeout.
         * If the HTTP requests timeouts, we should make sure to call the timeout callback if we didn't already.
         */
        DirectBiddingEventWithCaching.prototype.onHttpTimeout = function () {
            this.hasResponded = true;
            // If the handler already called the timeout callback, it's unnecessary to do it again
            if (!this.hasTimeouted) {
                this.callbackTimeout();
            }
        };
        /**
         * Handle the timeout set by client.
         * If a response has already been handled (success or error) then this function will do nothing.
         * If it has not been handled and a cached bid response exists it will be used to call the success callback.
         * If it has not been handled and no cached bid response exists the timeout callback is called.
         */
        DirectBiddingEventWithCaching.prototype.onTimeout = function () {
            // If the response has already been handled, do nothing
            if (this.hasResponded) {
                return;
            }
            this.hasTimeouted = true;
            // Get all the bids in the cache matching the requested bids. We succeed if at least one bid is found for the
            // request, else we timeout
            var cachedBids = this.cache.getCachedBids(this.slots);
            if (cachedBids.length === 0) {
                this.callbackTimeout();
            }
            else {
                Log.Debug("Cached bids returned because of timeout: ['" + cachedBids.map(function (bid) { return bid.impid; }).join("', '") + "']");
                this.callbackSuccess(JSON.stringify({ slots: cachedBids }), undefined);
            }
        };
        DirectBiddingEventWithCaching.NAME = "directbidding";
        return DirectBiddingEventWithCaching;
    }(AbstractEvent));

    var FASTBID_KEY = "criteo_fast_bid";
    function updateFastBid() {
        var expiration = 24 * 60 * 60 * 1000; // Expires after one day
        var ls = new LocalStorageHelper();
        // If local storage is not available or if fast bid is existing and not expired, do nothing
        if (!ls.checkLocalStorage() || ls.getItem(FASTBID_KEY, expiration) !== null) {
            return;
        }
        var updateRequest = new AsyncRequest("//static.criteo.net/js/ld/publishertag.prebid.js", undefined, undefined, false);
        updateRequest.send(function (data) {
            ls.setItem(FASTBID_KEY, data, expiration);
        }, function (state, status) {
            Log.Error(status.toString());
        });
    }

    // Arrow functions do not have their own "this" so cannot be used for polyfills
    // tslint:disable:only-arrow-functions
    // extends old browsers api (ie8-10) to support
    // javascript modern apis
    var Polyfills = /** @class */ (function () {
        function Polyfills() {
        }
        Polyfills.LoadPolyfills = function () {
            Polyfills.DefineIsArray();
            Polyfills.DefineIndexOf();
            Polyfills.DefineFilter();
        };
        // add static isArray method to the Array class
        // reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray
        Polyfills.DefineIsArray = function () {
            if (!Array.isArray) {
                Array.isArray = function (arg) {
                    return Object.prototype.toString.call(arg) === "[object Array]";
                };
            }
        };
        // add indexOf method to arrays
        // reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf
        Polyfills.DefineIndexOf = function () {
            if (!Array.prototype.indexOf) {
                Array.prototype.indexOf = function (searchElement, fromIndex) {
                    if (fromIndex === void 0) { fromIndex = 0; }
                    if (this === undefined) {
                        throw new TypeError("'this' is null or not defined");
                    }
                    var length = this.length;
                    if (length === 0) {
                        return -1;
                    }
                    if (fromIndex >= length) {
                        return -1;
                    }
                    var k = Math.max(fromIndex >= 0 ? fromIndex : length - Math.abs(fromIndex), 0);
                    while (k < length) {
                        if (k in this && this[k] === searchElement) {
                            return k;
                        }
                        k++;
                    }
                    return -1;
                };
            }
        };
        // add Filter method to arrays
        // reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
        Polyfills.DefineFilter = function () {
            if (!Array.prototype.filter) {
                Array.prototype.filter = function (fun) {
                    if (this === void 0 || this === undefined) {
                        throw new TypeError();
                    }
                    var len = this.length;
                    if (typeof fun !== "function") {
                        throw new TypeError();
                    }
                    var res = [];
                    var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
                    for (var i = 0; i < len; i++) {
                        if (i in this) {
                            var val = this[i];
                            if (fun.call(thisArg, val, i, this)) {
                                res.push(val);
                            }
                        }
                    }
                    return res;
                };
            }
        };
        return Polyfills;
    }());

    var CookieHelper = /** @class */ (function () {
        function CookieHelper() {
        }
        CookieHelper.SetCookie = function (key, value, exHours, customDoc, writeOnTopDomain) {
            if (writeOnTopDomain === void 0) { writeOnTopDomain = false; }
            var doc = customDoc || document;
            var d = new Date();
            d.setTime(d.getTime() + (exHours * 60 * 60 * 1000));
            var expires = "expires=" + d.toUTCString();
            if (!writeOnTopDomain) {
                CookieHelper.setCookieString(key, value, expires, undefined, doc);
                return doc.location.hostname;
            }
            var subDomains = doc.location.hostname.split(".");
            for (var i = 0; i < subDomains.length; ++i) {
                var domain = subDomains.slice(subDomains.length - i - 1, subDomains.length).join(".");
                // Try to write the cookie on this subdomain
                CookieHelper.setCookieString(key, value, expires, domain, doc);
                // Try to read the cookie to check if we wrote it
                var ck = CookieHelper.GetCookie(key, customDoc);
                if (ck && ck === value) {
                    return domain;
                }
            }
            return doc.location.hostname;
        };
        CookieHelper.DeleteCookie = function (key, customDoc, deleteOnTopDomain) {
            if (deleteOnTopDomain === void 0) { deleteOnTopDomain = false; }
            CookieHelper.SetCookie(key, "", 0, customDoc, deleteOnTopDomain);
        };
        CookieHelper.GetCookie = function (cookieName, customDoc) {
            var doc = customDoc || document;
            var cookies = doc.cookie.split(";");
            for (var _i = 0, cookies_1 = cookies; _i < cookies_1.length; _i++) {
                var cookie = cookies_1[_i];
                var cName = cookie.substr(0, cookie.indexOf("=")).replace(/^\s+|\s+$/g, "");
                var cVal = cookie.substr(cookie.indexOf("=") + 1);
                if (cName === cookieName) {
                    return decodeURIComponent(cVal);
                }
            }
            return undefined;
        };
        CookieHelper.setCookieString = function (key, value, expires, domain, doc) {
            var cookie = key + "=" + encodeURIComponent(value) + ";" + expires + ";";
            if (domain && domain !== "") {
                cookie += "domain=." + domain + ";";
            }
            doc.cookie = cookie + "path=/";
        };
        return CookieHelper;
    }());

    function tryDecodeURIComponent(value, fallback) {
        try {
            return decodeURIComponent(value);
        }
        catch (e) {
            return fallback !== undefined ? fallback : value;
        }
    }
    function parseUri(url) {
        var l = document.createElement("a");
        l.href = url;
        return {
            protocol: l.protocol,
            host: l.host,
            hostname: l.hostname,
            pathname: l.pathname[0] === "/" ? l.pathname.slice(1) : l.pathname,
            search: l.search,
            href: l.href
        };
    }

    function generateUuid() {
        var d = new Date().getTime();
        if (typeof performance !== "undefined" && typeof performance.now === "function") {
            d += performance.now(); // use high-precision timer if available
        }
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            /* tslint:disable:no-bitwise */
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
            /* tslint:enable */
        });
    }

    var CookieSynchronizer = /** @class */ (function () {
        function CookieSynchronizer(topFrame, isDebug, displayUrl) {
            this.isDebug = isDebug;
            this.topWin = topFrame;
            this.topDoc = topFrame.document;
            this.localStorageHelper = new LocalStorageHelper(this.topWin);
            this.localStorageEnabled = this.localStorageHelper.checkLocalStorage();
            this.topUrl = displayUrl;
        }
        CookieSynchronizer.isSafariBrowser = function () {
            return navigator.userAgent.match(CookieSynchronizer.SAFARI_CHECK_REGEX) !== null;
        };
        CookieSynchronizer.prototype.synchronizeCriteoUid = function (forceSyncframe) {
            var _this = this;
            // Only drop syncframe on safari browsers
            if (!forceSyncframe && !CookieSynchronizer.isSafariBrowser()) {
                return;
            }
            if (this.topWin.addEventListener) {
                if (this.topDoc.readyState === "complete") {
                    this.appendGumIframeIfDoesNotExist();
                }
                else {
                    // Based on jQuery https://github.com/jquery/jquery/blob/master/src/core/ready-no-deferred.js,
                    // in some cases, the DOMContentLoaded event is not triggered, and we need to wait for the load event of the window
                    var appendChildCb_1 = function () {
                        _this.topDoc.removeEventListener("DOMContentLoaded", appendChildCb_1);
                        _this.topWin.removeEventListener("load", appendChildCb_1);
                        _this.appendGumIframeIfDoesNotExist();
                    };
                    this.topWin.addEventListener("load", appendChildCb_1, false);
                    this.topDoc.addEventListener("DOMContentLoaded", appendChildCb_1, false);
                }
            }
            else {
                // postMessage can't handle objects in ie < 10, we don't care for the moment as we target Safari users
                return;
            }
        };
        CookieSynchronizer.prototype.appendGumIframeIfDoesNotExist = function () {
            var _this = this;
            var frameref = this.createGumIframe();
            var evtListener = function (event) {
                var data = event.data;
                // Discard messages coming from other iframes
                if (!data.isCriteoMessage) {
                    return;
                }
                // If the user is opt out, remove publisher-side cookies
                if (data.optout) {
                    _this.setClientSideOptOut();
                    _this.deleteClientSideUid();
                    _this.deleteClientSideIdfs();
                    _this.deleteClientSideSecureId();
                    // If it has a criteo uid or idfs or secureId, copy them on publisher domain
                }
                else {
                    if (data.uid) {
                        _this.setClientSideUid(data.uid);
                    }
                    if (data.idfs) {
                        _this.setClientSideIdfs(data.idfs);
                    }
                    // the syncframe can emit a signal to delete sid from publisher website
                    if (data.removeSid) {
                        _this.deleteClientSideSecureId();
                    }
                    else if (data.sid) {
                        _this.setClientSideSecureId(data.sid);
                    }
                }
            };
            // if the syncframe does not exist yet, attach a listener to the topWindow and append the syncframe
            if (!this.topDoc.getElementById(CookieSynchronizer.SYNCFRAME_ID)) {
                this.topWin.addEventListener("message", evtListener, false);
                this.topDoc.body.appendChild(frameref);
            }
        };
        CookieSynchronizer.prototype.getClientSideUid = function () {
            return this.getFromAllStorages(CookieSynchronizer.GUID_COOKIE_NAME);
        };
        CookieSynchronizer.prototype.setClientSideUid = function (uid) {
            this.writeOnAllStorages(CookieSynchronizer.GUID_COOKIE_NAME, uid, CookieSynchronizer.GUID_RETENTION_TIME_HOUR);
        };
        CookieSynchronizer.prototype.deleteClientSideUid = function () {
            this.deleteFromAllStorage(CookieSynchronizer.GUID_COOKIE_NAME);
        };
        CookieSynchronizer.prototype.getClientSideOptOut = function () {
            var optout = this.getFromAllStorages(CookieSynchronizer.OPTOUT_COOKIE_NAME);
            return Boolean(optout);
        };
        CookieSynchronizer.prototype.setClientSideOptOut = function () {
            this.writeOnAllStorages(CookieSynchronizer.OPTOUT_COOKIE_NAME, "1", CookieSynchronizer.OPTOUT_RETENTION_TIME_HOUR);
        };
        CookieSynchronizer.prototype.deleteClientSideIdfs = function () {
            this.deleteFromAllStorage(CookieSynchronizer.IDFS_COOKIE_NAME);
        };
        CookieSynchronizer.prototype.getClientSideIdfs = function () {
            return this.getFromAllStorages(CookieSynchronizer.IDFS_COOKIE_NAME);
        };
        CookieSynchronizer.prototype.setClientSideIdfs = function (idfs) {
            this.writeOnAllStorages(CookieSynchronizer.IDFS_COOKIE_NAME, idfs, CookieSynchronizer.GUID_RETENTION_TIME_HOUR);
        };
        CookieSynchronizer.prototype.getClientSideSecureId = function () {
            return this.getFromAllStorages(CookieSynchronizer.SECURE_ID_COOKIE_NAME);
        };
        CookieSynchronizer.prototype.setClientSideSecureId = function (secureId) {
            this.writeOnAllStorages(CookieSynchronizer.SECURE_ID_COOKIE_NAME, secureId, CookieSynchronizer.GUID_RETENTION_TIME_HOUR);
        };
        CookieSynchronizer.prototype.deleteClientSideSecureId = function () {
            this.deleteFromAllStorage(CookieSynchronizer.SECURE_ID_COOKIE_NAME);
        };
        CookieSynchronizer.prototype.getLocalWebId = function () {
            // first, try to read a local web id
            var lwidRead = CookieHelper.GetCookie(CookieSynchronizer.LOCAL_WEB_ID_COOKIE_NAME, this.topDoc);
            // if does not exist, it means we are either on a tracker/non fpc domain or it's the first time the user arrives on the website
            if (!lwidRead) {
                var lwidToWrite = generateUuid();
                CookieHelper.SetCookie(CookieSynchronizer.LOCAL_WEB_ID_COOKIE_NAME, lwidToWrite, CookieSynchronizer.GUID_RETENTION_TIME_HOUR, this.topDoc, true);
                lwidRead = CookieHelper.GetCookie(CookieSynchronizer.LOCAL_WEB_ID_COOKIE_NAME, this.topDoc);
            }
            return lwidRead || "NA";
        };
        CookieSynchronizer.prototype.createGumIframe = function () {
            var ifr = this.topDoc.createElement("iframe");
            var src = this.buildSyncframeSrc();
            ifr.src = src;
            ifr.id = CookieSynchronizer.SYNCFRAME_ID;
            ifr.style.display = "none";
            return ifr;
        };
        CookieSynchronizer.prototype.writeOnAllStorages = function (key, value, retentionTimeHours) {
            // Write on local storage
            if (this.localStorageEnabled) {
                this.localStorageHelper.setItem(key, value);
            }
            // Write on fp cookies
            CookieHelper.SetCookie(key, value, retentionTimeHours, this.topDoc, true);
        };
        CookieSynchronizer.prototype.getFromAllStorages = function (key) {
            var fromPubCookie = CookieHelper.GetCookie(key, this.topDoc);
            var fromLocalStorage;
            if (this.localStorageEnabled) {
                fromLocalStorage = this.localStorageHelper.getItem(key);
            }
            return fromPubCookie || fromLocalStorage;
        };
        CookieSynchronizer.prototype.deleteFromAllStorage = function (key) {
            // Delete cookies
            CookieHelper.DeleteCookie(key, this.topDoc, true);
            // Delete local storage
            if (this.localStorageEnabled) {
                this.localStorageHelper.removeItem(key);
            }
        };
        CookieSynchronizer.prototype.getTld = function () {
            var tld = CookieHelper.SetCookie(CookieSynchronizer.TLD_TEST_COOKIE_NAME, "test", 1, this.topDoc, true);
            CookieHelper.DeleteCookie(CookieSynchronizer.TLD_TEST_COOKIE_NAME, this.topDoc, true);
            return tld;
        };
        // we want to forward the user status to the syncframe in the syncframe hash
        CookieSynchronizer.prototype.buildSyncframeSrc = function () {
            var uid = this.getClientSideUid();
            var idfs = this.getClientSideIdfs();
            var optout = this.getClientSideOptOut();
            var sid = this.getClientSideSecureId();
            var lwid = this.getLocalWebId();
            var tld = this.getTld();
            var origin = "publishertag";
            var topUrl = encodeURIComponent(parseUri(this.topUrl).hostname);
            var version = PublisherTagVersion;
            var src = "https://gum.criteo.com/syncframe?topUrl=" + topUrl + (this.isDebug ? "&debug=1" : "");
            src += "#" + JSON.stringify({ optout: optout, uid: uid, idfs: idfs, sid: sid, origin: origin, version: version, lwid: lwid, tld: tld, topUrl: topUrl });
            return src;
        };
        CookieSynchronizer.GUID_COOKIE_NAME = "cto_idcpy";
        CookieSynchronizer.GUID_RETENTION_TIME_HOUR = 24 * 30 * 13; // 13 month
        CookieSynchronizer.IDFS_COOKIE_NAME = "cto_idfs";
        CookieSynchronizer.SECURE_ID_COOKIE_NAME = "cto_sid";
        CookieSynchronizer.LOCAL_WEB_ID_COOKIE_NAME = "cto_lwid";
        CookieSynchronizer.OPTOUT_COOKIE_NAME = "cto_optout";
        CookieSynchronizer.OPTOUT_RETENTION_TIME_HOUR = 24 * 30 * 12 * 5; // 5 years
        CookieSynchronizer.TLD_TEST_COOKIE_NAME = "cto_pub_test_tld";
        CookieSynchronizer.SYNCFRAME_ID = "criteo-syncframe";
        CookieSynchronizer.SAFARI_CHECK_REGEX = /^Mozilla\/5\.0 \([^)]+\) AppleWebKit\/[^ ]+ \(KHTML, like Gecko\) Version\/([^ ]+)( Mobile\/[^ ]+)? Safari\/[^ ]+$/i;
        return CookieSynchronizer;
    }());

    var DomManipulationTools = /** @class */ (function () {
        function DomManipulationTools() {
        }
        // get the highest accessible window before a X-domain call :
        // returns topmost browser window of current window & boolean
        // to say if cross-domain exception occurred
        DomManipulationTools.getHighestAccessibleWindow = function (currentWindow) {
            var oFrame = currentWindow;
            var xDomainException = false;
            try {
                while (oFrame.parent.document !== oFrame.document) {
                    if (oFrame.parent.document) {
                        oFrame = oFrame.parent;
                    }
                    else {
                        // chrome/ff set exception here
                        xDomainException = true;
                        break;
                    }
                }
            }
            catch (e) {
                // safari needs try/catch so sets exception here
                xDomainException = true;
            }
            return { topFrame: oFrame, err: xDomainException };
        };
        // tells if the code is executed in an iframe
        DomManipulationTools.inIframe = function () {
            try {
                return window.self !== window.top;
            }
            catch (e) {
                return true;
            }
        };
        return DomManipulationTools;
    }());

    // flags
    var DisplayContext;
    (function (DisplayContext) {
        DisplayContext[DisplayContext["InFriendlyIframe"] = 1] = "InFriendlyIframe";
        DisplayContext[DisplayContext["InUnfriendlyIframe"] = 2] = "InUnfriendlyIframe";
        DisplayContext[DisplayContext["DirectIntegration"] = 3] = "DirectIntegration";
    })(DisplayContext || (DisplayContext = {}));

    // holds the context of the publisher page and
    // the global parameters
    var Context = /** @class */ (function () {
        // default values
        function Context(document, window) {
            this.charset = document.charset
                ? document.charset
                : document.characterSet
                    ? document.characterSet
                    : "";
            // get the highest accessible url in the dom
            var highestAccessibleWindowStruct = DomManipulationTools.getHighestAccessibleWindow(window);
            this.displayContext = this.getDisplayContext(highestAccessibleWindowStruct);
            this.highestAccessibleUrl = this.getHighestAccessibleUrl(highestAccessibleWindowStruct);
            /* Sync criteo uid */
            // append syncframe to sync publisher and criteo cookies
            this.synchronizeCriteoUid(highestAccessibleWindowStruct, this.highestAccessibleUrl);
            var queryStringParams = this.getQueryStringParams(this.highestAccessibleUrl);
            this.debugMode = queryStringParams.pbt_debug === "1" || false;
            this.noLog = queryStringParams.pbt_nolog === "1" || false;
            if (this.debugMode) { // Activate the console debug for debug request.
                SetLogLevel(LogLevel.Debug);
            }
            this.location = window.location;
            this.protocol = window.location.protocol;
            this.dising = false; // set nodis
            this.ct0 = undefined; // publisher click tracking
            this.wpdt0 = undefined; // publisher display tracking
            this.isAdBlocked = undefined; // is the page adblocked ?
            this.rtaVarNames = [];
        }
        Context.prototype.getContextFlags = function () {
            var contextFlags = "";
            // debug mode
            contextFlags += this.debugMode ? "&debug=1" : "";
            contextFlags += this.noLog ? "&nolog=1" : "";
            return contextFlags;
        };
        // get the highest accessible url :
        // if using ie 6->10 with X-domain call,
        // it returns an empty string
        Context.prototype.getHighestAccessibleUrl = function (highestAccessibleWindowStruct) {
            var highestAccessibleWindow = highestAccessibleWindowStruct.topFrame;
            var crossDomainError = highestAccessibleWindowStruct.err;
            var sBestPageUrl = "";
            if (!crossDomainError) {
                // easy case- we can get top frame location
                sBestPageUrl = highestAccessibleWindow.location.href;
            }
            else {
                try {
                    // if friendly iframe
                    sBestPageUrl = highestAccessibleWindow.top.location.href;
                    if (!sBestPageUrl) {
                        // if chrome or safari use ancestor origin array
                        var aOrigins = highestAccessibleWindow.location.ancestorOrigins;
                        // get last origin which is top-domain :
                        sBestPageUrl = aOrigins[aOrigins.length - 1];
                    }
                }
                catch (e) {
                    // if ancestorOrigins param does'nt exist
                    sBestPageUrl = highestAccessibleWindow.document.referrer;
                }
            }
            return sBestPageUrl;
        };
        // represents the display context in which the Publishertag is loaded
        Context.prototype.getDisplayContext = function (highestAccessibleWindowStruct) {
            if (!DomManipulationTools.inIframe()) {
                return DisplayContext.DirectIntegration;
            }
            else if (highestAccessibleWindowStruct.err) {
                return DisplayContext.InUnfriendlyIframe;
            }
            else {
                return DisplayContext.InFriendlyIframe;
            }
        };
        Context.prototype.getQueryStringParams = function (highestAccessibleUrl) {
            var queryStringParams = {};
            var paramsString = highestAccessibleUrl.split("?");
            if (paramsString.length > 1) {
                var vars = paramsString[1].split("&");
                for (var _i = 0, vars_1 = vars; _i < vars_1.length; _i++) {
                    var param = vars_1[_i];
                    var pair = param.split("=");
                    queryStringParams[tryDecodeURIComponent(pair[0])] = tryDecodeURIComponent(pair[1]);
                }
            }
            return queryStringParams;
        };
        Context.prototype.synchronizeCriteoUid = function (highestAccessibleWindowStruct, highestAccessibleUrl) {
            var topFrame = highestAccessibleWindowStruct.topFrame;
            var soc = new CookieSynchronizer(topFrame, this.debugMode, highestAccessibleUrl);
            this.ctoIdOnPublisherDomain = soc.getClientSideUid(); // read uid from all storages
            this.isOptOut = soc.getClientSideOptOut(); // read optout status from all storages
            this.idfs = soc.getClientSideIdfs(); // read idfs from all storages
            this.secureId = soc.getClientSideSecureId(); // read secureId from all storages
            soc.synchronizeCriteoUid();
        };
        Context.prototype.getIdfs = function () {
            return [this.idfs, this.secureId].join(":");
        };
        Context.prototype.setIdfs = function (concatenatedIdfsAndSid) {
            var splitArray = concatenatedIdfsAndSid.split(":");
            if (splitArray[0]) {
                this.idfs = splitArray[0];
            }
            if (splitArray[1]) {
                this.secureId = splitArray[1];
            }
        };
        return Context;
    }());

    // this class holds all the global parameters
    // of Criteo Direct Bidder Standalone
    var StandaloneDirectBidder = /** @class */ (function () {
        function StandaloneDirectBidder() {
            this.bids = {};
            this.lineItemRanges = [];
            this.impIds = [];
        }
        return StandaloneDirectBidder;
    }());

    function isConditionalEvent(event) {
        return event.name === "conditionalEvent";
    }
    // the publisher tag
    var PublisherTag = /** @class */ (function () {
        function PublisherTag() {
            this.standaloneBidder = new StandaloneDirectBidder();
            this.events = [];
            this.context = new Context(document, window);
            Log.Debug("Publisher Tag loaded");
        }
        PublisherTag.prototype.push = function () {
            var events = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                events[_i] = arguments[_i];
            }
            // parse all events and push them to the list of events
            for (var _a = 0, events_1 = events; _a < events_1.length; _a++) {
                var event_1 = events_1[_a];
                this.events.push(event_1);
            }
            // we currently synchronously eval events (events can still be asynchronous)
            this.evalEvents();
        };
        PublisherTag.prototype.evalEvents = function () {
            // process the conditional events only when the adblocker status has been determined
            var i = 0;
            while (i < this.events.length) {
                var event_2 = this.events[i];
                if (isConditionalEvent(event_2) && !event_2.canEval()) {
                    i++;
                }
                else {
                    var eventsSpliced = this.events.splice(i, 1);
                    eventsSpliced[0].eval(this);
                }
            }
        };
        PublisherTag.VERSION = PublisherTagVersion;
        return PublisherTag;
    }());

    function createEventProcessor(unprocessedEvents) {
        // add events listener
        var result = {
            push: function () {
                var events = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    events[_i] = arguments[_i];
                }
                if (typeof events === "undefined") {
                    return;
                }
                for (var _a = 0, events_1 = events; _a < events_1.length; _a++) {
                    var evt = events_1[_a];
                    if (typeof evt === "function") {
                        evt();
                    }
                }
            }
        };
        // process queued json events
        if (unprocessedEvents && Array.isArray(unprocessedEvents)) {
            result.push.apply(result, unprocessedEvents);
        }
        return result;
    }

    if (!window.criteo_pubtag) {
        Polyfills.LoadPolyfills();
        window.criteo_pubtag = new PublisherTag();
    }
    window.Criteo = {
        PubTag: {
            Adapters: {
                Prebid: Prebid
            },
            DirectBidding: {
                DirectBiddingEvent: DirectBiddingEventWithCaching,
                DirectBiddingSlot: DirectBiddingSlot,
                DirectBiddingUrlBuilder: DirectBiddingUrlBuilder,
                Size: Size
            }
        },
        // Keep events
        events: window.Criteo ? window.Criteo.events : [],
        usePrebidEvents: window.Criteo ? window.Criteo.usePrebidEvents : true
    };
    if (window.Criteo.usePrebidEvents !== false) {
        window.Criteo.events = createEventProcessor(window.Criteo.events);
    }
    updateFastBid();

}());

//# sourceMappingURL=publishertag.prebid.js.map