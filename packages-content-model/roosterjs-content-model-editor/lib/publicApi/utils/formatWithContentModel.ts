import { ChangeSource, PluginEventType } from 'roosterjs-editor-types';
import { getPendingFormat, setPendingFormat } from '../../modelApi/format/pendingFormat';
import { IContentModelEditor } from '../../publicTypes/IContentModelEditor';
import {
    ContentModelFormatter,
    FormatWithContentModelContext,
    FormatWithContentModelOptions,
} from '../../publicTypes/parameter/FormatWithContentModelContext';

/**
 * The general API to do format change with Content Model
 * It will grab a Content Model for current editor content, and invoke a callback function
 * to do format change. Then according to the return value, write back the modified content model into editor.
 * If there is cached model, it will be used and updated.
 * @param editor Content Model editor
 * @param apiName Name of the format API
 * @param formatter Formatter function, see ContentModelFormatter
 * @param options More options, see FormatWithContentModelOptions
 */
export function formatWithContentModel(
    editor: IContentModelEditor,
    apiName: string,
    formatter: ContentModelFormatter,
    options?: FormatWithContentModelOptions
) {
    const {
        onNodeCreated,
        preservePendingFormat,
        getChangeData,
        changeSource,
        rawEvent,
        selectionOverride,
    } = options || {};

    editor.focus();

    const model = editor.createContentModel(undefined /*option*/, selectionOverride);
    const context: FormatWithContentModelContext = {
        deletedEntities: [],
        rawEvent,
    };

    if (formatter(model, context)) {
        const callback = () => {
            handleDeletedEntities(editor, context);

            if (model) {
                editor.setContentModel(model, undefined /*options*/, onNodeCreated);
            }

            if (preservePendingFormat) {
                const pendingFormat = getPendingFormat(editor);
                const pos = editor.getFocusedPosition();

                if (pendingFormat && pos) {
                    setPendingFormat(editor, pendingFormat, pos);
                }
            }

            return getChangeData?.();
        };

        if (context.skipUndoSnapshot) {
            const contentChangedEventData = callback();

            if (changeSource) {
                editor.triggerContentChangedEvent(changeSource, contentChangedEventData);
            }
        } else {
            editor.addUndoSnapshot(
                callback,
                changeSource || ChangeSource.Format,
                false /*canUndoByBackspace*/,
                {
                    formatApiName: apiName,
                }
            );
        }

        editor.cacheContentModel?.(model);
    }
}

function handleDeletedEntities(
    editor: IContentModelEditor,
    context: FormatWithContentModelContext
) {
    context.deletedEntities.forEach(({ entity, operation }) => {
        if (entity.id && entity.type) {
            editor.triggerPluginEvent(PluginEventType.EntityOperation, {
                entity: {
                    id: entity.id,
                    isReadonly: entity.isReadonly,
                    type: entity.type,
                    wrapper: entity.wrapper,
                },
                operation,
                rawEvent: context.rawEvent,
            });
        }
    });
}
