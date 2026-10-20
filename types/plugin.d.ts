/**
 * The Tumult plugin API — vendored, self-contained, one file.
 *
 * A plugin author needs these types and nothing else: this file has no
 * imports, so it typechecks in a bare checkout with no Tumult packages
 * installed (see `tsconfig.json`, which points `@tumult/ui` and `@tumult/core`
 * here).
 *
 * It is deliberately HAND-MAINTAINED rather than generated. Bundling
 * declarations out of the Tumult workspace would need api-extractor-class
 * tooling; instead this file is pinned two ways from the other side — in the
 * Tumult repository, `tsconfig.workspace.json` typechecks the same example
 * against the real `@tumult/ui` / `@tumult/core` sources, so the two can only
 * drift in ways a single example does not exercise.
 *
 * Pinned to plugin API `1.0.0` and core contract `1.0.0` — the versions a
 * manifest's `minUI` / `minCore` are compared against. When Tumult's contract
 * grows, this file is updated to match; a plugin declares which version it was
 * written against and Tumult refuses to install one that asks for a newer
 * build than it is.
 */

/** Undoes one registration. Idempotent — calling it twice is a no-op. */
export type Disposable = () => void;

/** The version of the plugin API these types describe (`minUI`). */
export declare const PLUGIN_API_VERSION = "1.0.0";

/** The version of the `ChatClient` contract these types describe (`minCore`). */
export declare const CONTRACT_VERSION = "1.0.0";

/**
 * Capabilities a plugin may declare. Each extension API names the permission
 * it requires; Tumult refuses a call (and rolls back the install) when the
 * manifest did not declare it, and refuses a manifest naming anything outside
 * this list.
 *
 * The lane a plugin runs in is derived from these, never declared: only
 * `commands`, `composer-actions` and `styles` can run in the sandbox lane,
 * because the other three hand Tumult a live Vue component.
 */
export type Permission =
    | "timeline-renderers"
    | "composer-actions"
    | "member-decorations"
    | "commands"
    | "settings-tabs"
    | "styles";

/** Every permission, for runtime checks (`permissions.includes(...)`). */
export declare const PLUGIN_PERMISSIONS: readonly Permission[];

/**
 * What a plugin declares about itself.
 *
 * For a distributable plugin the same object is the release document
 * (`tumult.plugin.json`) that Tumult validates and shows the user before
 * installing — plus two release-only fields, `entry` and `integrity`, which
 * the template's release workflow fills in.
 */
export interface PluginManifest {
    /**
     * Stable, namespaced id — e.g. `cc.example.shrug`. Lowercase segments
     * separated by dots. Tumult keys installs by it; installing the same id
     * twice is refused.
     */
    id: string;
    name: string;
    version: string;
    author?: string;
    description?: string;
    /** Minimum core contract version this plugin understands. */
    minCore?: string;
    /** Minimum plugin API version this plugin understands. */
    minUI?: string;
    /** Every extension API the plugin uses. Tumult enforces these. */
    permissions: Permission[];
    /**
     * Release only: the filename of the built bundle attached to the release
     * (e.g. `plugin.js`). Set by the template; do not point it at a path.
     */
    entry?: string;
    /**
     * Release only: `sha256-<base64>` of that bundle. The release workflow
     * computes it — never write it by hand.
     */
    integrity?: string;
}

// ---------------------------------------------------------------------------
// The chat client contract (a plugin's read/write surface on the shell).
// Subset of `packages/core/src/contract.ts`; every member here exists there.
// ---------------------------------------------------------------------------

/** Cancels a subscription created by `Subscribable.subscribe`. */
export interface Subscription {
    unsubscribe(): void;
}

/** A read-only snapshot feed you can subscribe to. */
export interface Subscribable<T> {
    /** The current snapshot. Cheap — no I/O. */
    get(): T;
    /** Call `listener` with the current value, then on every change. */
    subscribe(listener: (value: T) => void): Subscription;
}

/** Where the sync loop is. `"error"` is honest, not fatal. */
export type ConnectionState = "starting" | "syncing" | "reconnecting" | "error" | "stopped";

/** Delivery state of one message. */
export type MessageStatus = "sending" | "sent" | "failed";

/**
 * Decryption state. `"pending"` is normal and transient: an encrypted event
 * can arrive before its keys, and is upgraded in place later.
 */
export type DecryptionStatus = "ok" | "pending" | "failed";

/** One message, as the timeline renders it. A plain snapshot. */
export interface MessageView {
    id: string;
    /** Matrix event type, e.g. `m.room.message` or your own custom type. */
    type: string;
    senderId: string;
    /** Display name, self-hosted or the localpart. */
    senderName: string;
    /** Usually an `mxc://` URI — resolve it before rendering. */
    senderAvatarUrl: string | null;
    body: string;
    /** Milliseconds since the epoch. */
    timestamp: number;
    status: MessageStatus;
    decryption: DecryptionStatus;
    /**
     * The event content as plain JSON. Yours for a custom `type`; for
     * `m.room.message` you usually want `body`.
     */
    content: Readonly<Record<string, unknown>>;
    edited: boolean;
    redacted: boolean;
    reply: ReplyView | null;
    reactions: ReactionView[];
    /** User ids whose read receipt is at or past this event. */
    readBy: string[];
}

/** The quoted message a reply points at. */
export interface ReplyView {
    eventId: string;
    senderId: string;
    senderName: string;
    /** Quoted text with any `> ` fallback stripped; `""` when unknown. */
    body: string;
}

/** One grouped emoji annotation. */
export interface ReactionView {
    emoji: string;
    count: number;
    ownReacted: boolean;
}

/** One page of server-side room search results. */
export interface SearchPage {
    hits: MessageView[];
    nextBatch: string | null;
    total: number;
}

/** Parameters for creating a top-level space (a guild). */
export interface CreateSpaceParams {
    name: string;
    topic?: string;
}

/** Parameters for creating a channel inside a space. */
export interface CreateChannelParams {
    name: string;
    topic?: string;
    visibility?: "private" | "public";
    aliasLocalpart?: string;
    encrypted?: boolean;
}

/** Parameters for creating a 1:1 direct-message room. */
export interface CreateDmParams {
    userId: string;
    encrypted?: boolean;
}

/** One user-directory hit. */
export interface UserSearchResult {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
}

/** Who may join a room. */
export type JoinRule = "public" | "invite" | "knock" | "restricted";

/** How much history new members can see. */
export type HistoryVisibility = "shared" | "invited" | "joined" | "world_readable";

/** Editable room settings; omitted fields are left unchanged. */
export interface RoomSettingsPatch {
    name?: string;
    topic?: string | null;
    avatar?: Blob | null;
    joinRule?: JoinRule;
    historyVisibility?: HistoryVisibility;
    canonicalAlias?: string | null;
}

/** One room, as the room list and rail need it. */
export interface RoomSummary {
    id: string;
    name: string;
    topic: string | null;
    avatarUrl: string | null;
    /** True for Matrix spaces, which render as guilds/categories. */
    isSpace: boolean;
    /** Parent spaces. Empty means orphaned — a DM by Tumult's rule. */
    parentSpaceIds: string[];
    unreadCount: number;
    highlightCount: number;
    fullyReadEventId: string | null;
    joinRule: JoinRule;
    historyVisibility: HistoryVisibility;
    canonicalAlias: string | null;
    favourite: boolean;
    favouriteOrder: number | null;
}

/** The signed-in identity. `null` when logged out. */
export interface SessionView {
    userId: string;
    deviceId: string;
    homeserverUrl: string;
}

/** Encryption health of this device. */
export interface SecurityStatus {
    crossSigningReady: boolean;
    backupEnabled: boolean;
    backupTrusted: boolean;
    secretStorageReady: boolean;
}

/** Membership of a room. The roster publishes `join` and `invite`. */
export type Membership = "join" | "invite" | "leave" | "ban" | "knock";

/**
 * Presence of a member. `"unknown"` is a real state: presence is only trusted
 * once the server sent it this session, so never invent `"online"`.
 */
export type PresenceState = "online" | "offline" | "unknown";

/** One member of a room. */
export interface MemberView {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    membership: Membership;
    powerLevel: number;
    isSelf: boolean;
    presence: PresenceState;
    lastActiveTs: number | null;
}

/** Our own profile. */
export interface ProfileView {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
}

/** A room's power levels plus this account's own standing in it. */
export interface RoomPowerLevelsView {
    users: Record<string, number>;
    usersDefault: number;
    eventsDefault: number;
    stateDefault: number;
    ban: number;
    kick: number;
    redact: number;
    invite: number;
    events: Record<string, number>;
    myPowerLevel: number;
    canKick: boolean;
    canBan: boolean;
    canSetPowerLevel: boolean;
    canEditSettings: boolean;
}

/** The `file` descriptor on an encrypted `m.room.message` media event. */
export interface EncryptedAttachment {
    url: string;
    key: {
        alg: string;
        key_ops: string[];
        kty: string;
        k: string;
        ext: boolean;
    };
    iv: string;
    hashes: Record<string, string>;
    v: string;
}

/** One thread in a room. */
export interface ThreadSummary {
    rootEventId: string;
    replyCount: number;
    lastReplyTs: number;
    unreadCount: number;
    hasParticipated: boolean;
}

/** Login parameters (a plugin rarely needs these). */
export interface LoginParams {
    homeserverUrl: string;
}

/** The callback leg of login (a plugin rarely needs these). */
export interface CompleteLoginParams {
    callbackUrl: string;
}

/**
 * The chat client — the same contract Tumult's own UI uses.
 *
 * Every method is a plain async call; every feed (`timeline`, `members`, …)
 * returns the SAME `Subscribable` instance for a given id on repeat calls, so
 * subscribing twice costs one subscription.
 */
export interface ChatClient {
    login(params: LoginParams): Promise<void>;
    completeLogin(params: CompleteLoginParams): Promise<void>;
    restoreSession(): Promise<boolean>;
    logout(): Promise<void>;
    /** Boot crypto and start the sync loop. Requires a session. */
    start(): Promise<void>;
    /** Stop the sync loop without discarding the session. */
    stop(): Promise<void>;

    session: Subscribable<SessionView | null>;
    connection: Subscribable<ConnectionState>;
    rooms: Subscribable<RoomSummary[]>;
    security: Subscribable<SecurityStatus>;
    profile: Subscribable<ProfileView | null>;
    /** Snapshot feed for one room's timeline. */
    timeline(roomId: string): Subscribable<MessageView[]>;
    /**
     * Paginate one page of history backwards into `timeline(roomId)`.
     * Resolves `true` when the page added events, `false` at the start of
     * history — callers must not scroll on `false`.
     */
    loadMore(roomId: string): Promise<boolean>;
    /** Send one plaintext message, optionally as a reply. */
    send(roomId: string, body: string, replyToEventId?: string): Promise<void>;
    /** Retry a failed send (the pending event the SDK left in `NOT_SENT`). */
    retry(roomId: string, eventId: string): Promise<void>;
    /** Upload and send a media file, with an optional caption. */
    sendMediaMessage(roomId: string, file: File | Blob, body?: string): Promise<void>;
    /** Toggle our `emoji` reaction on a message. */
    toggleReaction(roomId: string, targetEventId: string, emoji: string): Promise<void>;
    /** Replace one of our own messages' body via `m.replace`. */
    edit(roomId: string, targetEventId: string, newBody: string): Promise<void>;
    /** Send or clear our typing notification. */
    sendTyping(roomId: string, isTyping: boolean): Promise<void>;
    /** False when the homeserver has no thread support. */
    supportsThreads(): boolean;
    /** Resolve an `mxc://` URI to a URL an `<img>` can load. */
    resolveMedia(uri: string, size: number): Promise<string>;
    /** Resolve an `mxc://` URI to the full (unresized) media. */
    resolveMediaDownload(uri: string): Promise<string>;
    /** Resolve an encrypted attachment descriptor to a loadable URL. */
    resolveEncryptedMedia(file: EncryptedAttachment): Promise<string>;
    /** Request browser notification permission. */
    requestNotificationPermission(): Promise<NotificationPermission>;
    /** Thread list for a room. */
    threads(roomId: string): Subscribable<ThreadSummary[]>;
    /** Timeline for one thread. */
    threadTimeline(threadId: string): Subscribable<MessageView[]>;
    /** Send a reply into a thread. */
    sendReply(roomId: string, threadId: string, body: string): Promise<void>;
    /** Mark a thread as read up to its latest event. */
    markThreadRead(threadId: string): Promise<void>;
    /** Send a read receipt and set `m.fully_read` to the live tail. */
    markRead(roomId: string): Promise<void>;
    /** Redact an event: our own, or anything our power levels allow. */
    redact(roomId: string, eventId: string, reason?: string): Promise<void>;
    /** Server-side search over one room's history. Encrypted rooms match nothing. */
    search(roomId: string, term: string, opts?: { nextBatch?: string }): Promise<SearchPage>;
    /** Ensure `eventId` is in the timeline (bounded pagination). */
    jumpTo(roomId: string, eventId: string): Promise<boolean>;
    /** Tell the client which room the user is viewing. */
    setRoomSelection(roomId: string | null): void;
    /** Grow the room window by one page. Resolves `false` at the cap. */
    loadMoreRooms(): Promise<boolean>;
    /** Whether a "load more rooms" affordance should be shown. */
    hasMoreRooms(): boolean;
    /** Create a top-level space (a guild on the rail). */
    createSpace(params: CreateSpaceParams): Promise<string>;
    /** Create a channel under `spaceId` and link it. */
    createChannel(spaceId: string, params: CreateChannelParams): Promise<string>;
    /** Create a private 1:1 room with `userId`. */
    createDm(params: CreateDmParams): Promise<string>;
    /** Join a room by id or `#alias:server` (also accepts an invite). */
    joinRoom(idOrAlias: string): Promise<string>;
    /** Leave a room we're in, or reject an invite. */
    leave(roomId: string): Promise<void>;
    /** Invite `userId` to `roomId`. */
    invite(roomId: string, userId: string): Promise<void>;
    /** Update a room's settings; only the present fields are sent. */
    updateRoomSettings(roomId: string, patch: RoomSettingsPatch): Promise<void>;
    /** User-directory search over ids, display names and domains. */
    searchUsers(term: string, opts?: { limit?: number }): Promise<UserSearchResult[]>;
    /** Member roster for one room, power level descending. */
    members(roomId: string): Subscribable<MemberView[]>;
    /** Fetch a room's full membership list (lazy loading). */
    loadMembers(roomId: string): Promise<void>;
    /** A room's power levels plus this account's standing. */
    powerLevels(roomId: string): Subscribable<RoomPowerLevelsView | null>;
    /** Members banned from a room. */
    banned(roomId: string): Subscribable<MemberView[]>;
    /** Kick `userId` from `roomId`. Server-enforced. */
    kick(roomId: string, userId: string, reason?: string): Promise<void>;
    /** Ban `userId` from `roomId`. Server-enforced. */
    ban(roomId: string, userId: string, reason?: string): Promise<void>;
    /** Lift a ban. */
    unban(roomId: string, userId: string): Promise<void>;
    /** Set a member's explicit power level. Server-enforced. */
    setPowerLevel(roomId: string, userId: string, powerLevel: number): Promise<void>;
    /** Update our own display name and/or avatar. */
    setProfile(params: { displayName?: string; avatar?: Blob | null }): Promise<void>;
    /** Set up secret storage plus a fresh key backup; returns the recovery key. */
    setupRecovery(): Promise<string>;
    /** Restore the key backup from a recovery key. Resolves `true` when verified. */
    restoreBackup(recoveryKey: string): Promise<boolean>;
    /** Start an interactive SAS verification of this user's own devices. */
    startVerification(): Promise<void>;
    /** Accept an incoming verification request. */
    acceptVerification(id: string): Promise<void>;
    /** Decline an incoming verification request. */
    declineVerification(id: string): Promise<void>;
    /** Confirm the SAS emoji/decimal match. */
    confirmSas(id: string): Promise<void>;
    /** Report the SAS does not match. */
    mismatchSas(id: string): Promise<void>;
    /** This account's devices with verification status. */
    listDevices(): Promise<DeviceView[]>;
}

/** One of this account's devices. */
export interface DeviceView {
    id: string;
    displayName: string | null;
    lastSeenTs: number | null;
    isCurrent: boolean;
    verified: boolean;
}

// Wave 1: the extension points a plugin can contribute to.
// ---------------------------------------------------------------------------

/** Props every timeline renderer component receives (from `vue`). */
export interface TimelineRendererProps {
    message: MessageView;
}

/** One timeline renderer registration. */
export interface RendererEntry {
    /** A Vue component (from `vue`), given `TimelineRendererProps`. */
    component: unknown;
    /** Higher wins. */
    priority: number;
    /** Render only for messages this accepts. Default: every message of the type. */
    match?(message: MessageView): boolean;
}

/** What a composer action sees when it runs. */
export interface ComposerActionContext {
    roomId: string;
    /** The draft exactly as typed when the action ran. */
    draft: string;
    client: ChatClient;
    /** Replace the draft without sending. */
    setDraft(text: string): void;
}

/** One button in the composer's action row. */
export interface ComposerAction {
    /** Stable, namespaced id — the registry keys by it. */
    id: string;
    /** Accessible name; also the tooltip. */
    label: string;
    /** Glyph rendered in the button; falls back to the label text. */
    icon?: string;
    /** Higher sorts further left. Default 0. */
    priority?: number;
    run(ctx: ComposerActionContext): void | Promise<void>;
}

/** What a slash command sees when it runs. */
export interface CommandContext {
    /** The room the command was typed into. */
    roomId: string;
    client: ChatClient;
    /** Everything after `/name`, trimmed ("" when the command had no args). */
    args: string;
    /** The full typed line, e.g. `/shrug deal with it`. */
    raw: string;
}

/** A slash command. */
export interface Command {
    /** Lowercase name without the slash — a leading "/" and case are normalized. */
    name: string;
    /** Palette line under the name. */
    description?: string;
    /** Palette hint next to the name, e.g. `<text>`. */
    usage?: string;
    run(ctx: CommandContext): void | Promise<void>;
}

/** Props every member decoration component receives. */
export interface MemberDecorationProps {
    member: MemberView;
    /** The room the member row belongs to. */
    roomId: string;
}

/** A small component rendered after a member row's built-in badges. */
export interface MemberDecoration {
    /** Stable, namespaced id — the registry keys by it. */
    id: string;
    /** A Vue component (from `vue`), given `MemberDecorationProps`. */
    component: unknown;
    /** Higher sorts further right. Default 0. */
    priority?: number;
    /** Render only for members this returns true for. Default: every member. */
    match?(member: MemberView): boolean;
}

/** Props every settings tab receives. */
export interface SettingsTabProps {
    client: ChatClient;
    /** Close the settings dialog. */
    close(): void;
}

/** One tab in the settings dialog. */
export interface SettingsTab {
    /** Stable, namespaced id — the registry keys by it. */
    id: string;
    /** Label in the tab strip. */
    title: string;
    /** A Vue component (from `vue`), given `SettingsTabProps`. */
    component: unknown;
    /** Higher sorts earlier. Default 0. */
    priority?: number;
}

/** The registration surface every plugin gets — permission-checked. */
export interface PluginApi {
    /** Register a timeline renderer for one Matrix event type. */
    addRenderer(type: string, entry: RendererEntry): Disposable;
    /** Add a button to the composer's action row. */
    addComposerAction(action: ComposerAction): Disposable;
    /** Register a `/name` slash command for the composer. */
    addCommand(command: Command): Disposable;
    /** Add a badge/decoration to member rows that `match` accepts. */
    addMemberDecoration(decoration: MemberDecoration): Disposable;
    /** Add a tab to the settings dialog. */
    addSettingsTab(tab: SettingsTab): Disposable;
    /**
     * Append a `<style>` element to the document. The CSS applies app-wide and
     * must be self-contained: `@import` and any `url()` other than `data:`,
     * `blob:` or a `#fragment` throw instead of landing.
     */
    injectStylesheet(css: string): Disposable;
}

/** Media resolution, passed through from the shell's client. */
export interface PluginMedia {
    /** `mxc://` URI → loadable URL at `size` CSS px (thumbnail, 2x fetch). */
    resolve(uri: string, size: number): Promise<string>;
    /** `mxc://` URI → full (unresized) media as a loadable URL. */
    resolveDownload(uri: string): Promise<string>;
    /** Encrypted attachment descriptor → loadable URL (fetches + decrypts). */
    resolveEncrypted(file: EncryptedAttachment): Promise<string>;
}

/** Current room/guild selection and navigation. */
export interface RoomSelection {
    view: "dms" | "guild";
    guildId?: string | undefined;
    roomId?: string | undefined;
}

/** Attribute optional, so `inject` may return null. */
export declare const SelectionKey: symbol;
/** Current selection + navigation (component-level hooks only). */
export interface SelectionContext {
    current: RoomSelection;
    select(next: RoomSelection): void;
    hrefFor(next: RoomSelection): string;
}

/** The thing a leave is about. */
export interface LeaveTarget {
    id: string;
    name: string;
    isSpace: boolean;
}

/** What a member row can ask the shell to do. */
export type MemberModerationKind = "kick" | "ban" | "unban" | "set-power";

/** A moderation request, scoped to the room it came from. */
export interface MemberModeration {
    kind: MemberModerationKind;
    roomId: string;
    member: MemberView;
}

/** The shell's cross-pane action channel. */
export interface ActionsContext {
    requestLeave(target: LeaveTarget): void;
    requestModeration(action: MemberModeration): void;
    requestMarkRead(roomId: string): void;
}

/**
 * Everything one plugin can touch during `install()`.
 *
 * Data flows through `client`, navigation through `selection`, cross-pane
 * dialogs through `actions`, and `mxc://` resolution through `media`. There is
 * no `window` or `document` handle here — the context is the API surface.
 */
export interface PluginContext extends PluginApi {
    /** This plugin's own manifest (id, name, declared permissions). */
    readonly manifest: PluginManifest;
    /** The chat client — the same contract the UI itself uses. */
    readonly client: ChatClient;
    /** Current room/guild selection and navigation. */
    readonly selection: SelectionContext;
    /** Cross-pane dialog channel (leave, moderation). */
    readonly actions: ActionsContext;
    /** `mxc://` resolvers wired to the client's authenticated media. */
    readonly media: PluginMedia;
}

/**
 * The plugin itself.
 *
 * `install` runs once per install and may return a `Disposable` to undo
 * anything you set up outside the context. Everything the context hands back
 * is disposed on uninstall, then `uninstall()` runs. Installing again after a
 * successful uninstall is allowed.
 */
export interface Plugin {
    readonly manifest: PluginManifest;
    install(ctx: PluginContext): void | Disposable;
    uninstall?(): void;
}

/**
 * Compatibility helpers, re-exported for plugins that check versions at
 * runtime (Tumult itself uses these when it installs you).
 */
/** Compare two dotted numeric versions; <0, 0 or >0. */
export declare function compareVersions(a: string, b: string): number;
/** `"sandbox"` when every permission is logic-only, otherwise `"trusted"`. */
export declare function deriveLane(manifest: { permissions: readonly Permission[] }): "sandbox" | "trusted";
