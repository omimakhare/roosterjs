import applyDefaultFormat from '../../publicApi/format/applyDefaultFormat';
import keyboardDelete from '../../publicApi/editing/keyboardDelete';
import { areSameRangeEx } from 'roosterjs-content-model-editor/lib/modelApi/selection/areSameRangeEx';
import { ContentModelEditPluginState } from '../../publicTypes/pluginState/ContentModelEditPluginState';
import { IContentModelEditor } from '../../publicTypes/IContentModelEditor';
import { isCharacterValue } from 'roosterjs-editor-dom';
import { isNodeOfType } from 'roosterjs-content-model-dom';
import { reconcileTextSelection } from 'roosterjs-content-model-editor/lib/modelApi/selection/reconcileTextSelection';
import {
    IEditor,
    Keys,
    NodeType,
    PluginEvent,
    PluginEventType,
    PluginKeyDownEvent,
    PluginWithState,
    SelectionRangeEx,
    SelectionRangeTypes,
} from 'roosterjs-editor-types';

// During IME input, KeyDown event will have "Process" as key
const ProcessKey = 'Process';

/**
 * ContentModel plugins helps editor to do editing operation on top of content model.
 * This includes:
 * 1. Delete Key
 * 2. Backspace Key
 */
export default class ContentModelEditPlugin
    implements PluginWithState<ContentModelEditPluginState> {
    private editor: IContentModelEditor | null = null;

    /**
     * Construct a new instance of ContentModelEditPlugin class
     * @param state State of this plugin
     */
    constructor(private state: ContentModelEditPluginState) {
        // TODO: Remove tempState parameter once we have standalone Content Model editor
    }

    /**
     * Get name of this plugin
     */
    getName() {
        return 'ContentModelEdit';
    }

    /**
     * The first method that editor will call to a plugin when editor is initializing.
     * It will pass in the editor instance, plugin should take this chance to save the
     * editor reference so that it can call to any editor method or format API later.
     * @param editor The editor object
     */
    initialize(editor: IEditor) {
        // TODO: Later we may need a different interface for Content Model editor plugin
        this.editor = editor as IContentModelEditor;
        this.editor.getDocument().addEventListener('selectionchange', this.onNativeSelectionChange);
    }

    /**
     * The last method that editor will call to a plugin before it is disposed.
     * Plugin can take this chance to clear the reference to editor. After this method is
     * called, plugin should not call to any editor method since it will result in error.
     */
    dispose() {
        if (this.editor) {
            this.editor
                .getDocument()
                .removeEventListener('selectionchange', this.onNativeSelectionChange);
            this.editor = null;
        }
    }

    /**
     * Get plugin state object
     */
    getState(): ContentModelEditPluginState {
        return this.state;
    }

    /**
     * Core method for a plugin. Once an event happens in editor, editor will call this
     * method of each plugin to handle the event as long as the event is not handled
     * exclusively by another plugin.
     * @param event The event to handle:
     */
    onPluginEvent(event: PluginEvent) {
        if (this.editor) {
            switch (event.eventType) {
                case PluginEventType.EditorReady:
                    this.editor.createContentModel();
                    break;

                case PluginEventType.KeyDown:
                    this.handleKeyDownEvent(this.editor, event);
                    break;

                case PluginEventType.Input:
                case PluginEventType.SelectionChanged:
                    this.reconcileSelection(this.editor);
                    break;

                case PluginEventType.ContentChanged:
                    this.clearCachedModel(this.editor);
                    break;
            }
        }
    }

    private handleKeyDownEvent(editor: IContentModelEditor, event: PluginKeyDownEvent) {
        const rawEvent = event.rawEvent;
        const which = rawEvent.which;

        if (rawEvent.defaultPrevented || event.handledByEditFeature) {
            // Other plugins already handled this event, so it is most likely content is already changed, we need to clear cached content model
            this.clearCachedModel(editor);
        } else {
            // TODO: Consider use ContentEditFeature and need to hide other conflict features that are not based on Content Model
            switch (which) {
                case Keys.BACKSPACE:
                case Keys.DELETE:
                    // Use our API to handle BACKSPACE/DELETE key.
                    // No need to clear cache here since if we rely on browser's behavior, there will be Input event and its handler will reconcile cache
                    keyboardDelete(editor, rawEvent);
                    break;

                case Keys.ENTER:
                    // ENTER key will create new paragraph, so need to update cache to reflect this change
                    this.clearCachedModel(editor);
                    break;

                default:
                    if (isCharacterValue(rawEvent) || rawEvent.key == ProcessKey) {
                        applyDefaultFormat(editor);
                    }
                    break;
            }
        }
    }

    private onNativeSelectionChange = () => {
        if (this.editor?.hasFocus()) {
            this.reconcileSelection(this.editor);
        }
    };

    private reconcileSelection(editor: IContentModelEditor, newRangeEx?: SelectionRangeEx) {
        const cachedRangeEx = this.state.cachedRangeEx;

        this.state.cachedRangeEx = undefined; // Clear it to force getSelectionRangeEx() retrieve the latest selection range
        newRangeEx = newRangeEx || editor.getSelectionRangeEx();

        if (
            this.state.cachedModel &&
            (!cachedRangeEx || !areSameRangeEx(newRangeEx, cachedRangeEx))
        ) {
            if (!this.internalReconcileSelection(cachedRangeEx, newRangeEx)) {
                this.clearCachedModel(editor);
                editor.createContentModel();
            }
        }

        this.state.cachedRangeEx = newRangeEx;
    }

    private internalReconcileSelection(
        cachedRangeEx: SelectionRangeEx | undefined,
        newRangeEx: SelectionRangeEx
    ) {
        let newRange =
            newRangeEx.type == SelectionRangeTypes.Normal && newRangeEx.ranges[0]?.collapsed
                ? newRangeEx.ranges[0]
                : undefined;

        if (
            cachedRangeEx?.type == SelectionRangeTypes.Normal &&
            cachedRangeEx.ranges[0]?.collapsed
        ) {
            const range = cachedRangeEx.ranges[0];
            const node = range.startContainer;

            if (isNodeOfType(node, NodeType.Text) && node != newRange?.startContainer) {
                reconcileTextSelection(node);
            }
        } else {
            return false;
        }

        if (newRange) {
            let { startContainer, startOffset } = newRange;
            if (!isNodeOfType(startContainer, NodeType.Text)) {
                startContainer = startContainer.childNodes[startOffset];
                startOffset = 0;
            }

            if (isNodeOfType(startContainer, NodeType.Text)) {
                if (reconcileTextSelection(startContainer, startOffset)) {
                    console.log('Reconcile succeeded');

                    return true;
                }
            }
        }

        return false;
    }

    private clearCachedModel(editor: IContentModelEditor) {
        if (!editor.isInShadowEdit()) {
            if (this.state.cachedModel) {
                console.log('Clear cache');
            }
            this.state.cachedModel = undefined;
            this.state.cachedRangeEx = undefined;
        }
    }
}

/**
 * @internal
 * Create a new instance of ContentModelEditPlugin class.
 * This is mostly for unit test
 * @param state State of this plugin
 */
export function createContentModelEditPlugin(state: ContentModelEditPluginState) {
    return new ContentModelEditPlugin(state);
}
