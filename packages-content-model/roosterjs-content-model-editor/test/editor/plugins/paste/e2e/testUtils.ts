import ContentModelEditor from '../../../../../lib/editor/ContentModelEditor';
import ContentModelPastePlugin from '../../../../../lib/editor/plugins/PastePlugin/ContentModelPastePlugin';
import { cloneModel } from '../../../../../lib/modelApi/common/cloneModel';
import { ContentModelDocument } from 'roosterjs-content-model-types';
import {
    ContentModelEditorOptions,
    IContentModelEditor,
} from '../../../../../lib/publicTypes/IContentModelEditor';

export function initEditor(id: string) {
    let node = document.createElement('div');
    node.id = id;
    document.body.insertBefore(node, document.body.childNodes[0]);

    let options: ContentModelEditorOptions = {
        plugins: [new ContentModelPastePlugin()],
        getVisibleViewport: () => {
            return {
                top: 100,
                bottom: 200,
                left: 100,
                right: 200,
            };
        },
    };

    let editor = new ContentModelEditor(node as HTMLDivElement, options);

    return editor as IContentModelEditor;
}

export function expectEqual(model1: ContentModelDocument, model2: ContentModelDocument) {
    /// Remove Cached elements and undefined properties
    const newModel = JSON.parse(
        JSON.stringify(
            cloneModel(model1, {
                includeCachedElement: false,
            })
        )
    );
    expect(newModel).toEqual(model2);
}
