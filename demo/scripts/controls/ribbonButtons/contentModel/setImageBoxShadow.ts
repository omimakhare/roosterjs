import isContentModelEditor from '../../editor/isContentModelEditor';
import { RibbonButton } from 'roosterjs-react';
import { setImageBoxShadow } from 'roosterjs-content-model';

const STYLES_NAMES: Record<string, string> = {
    noShadow: 'noShadow',
    bottomRight: 'bottomRight',
    bottom: 'bottom',
    bottomLeft: 'bottomLeft',
    right: 'right',
    center: 'center',
    left: 'left',
    topRight: 'topRight',
    top: 'top',
    topLeft: 'topLeft',
};

const STYLES: Record<string, string> = {
    noShadow: '',
    bottomRight: '0px 4px 3px 0px #aaaaaa',
    bottom: '0px 0px 3px 0px #aaaaaa',
    bottomLeft: '0px 0px 3px 3px #aaaaaa',
    right: '0px 4px 0px 0px #aaaaaa',
    center: '4px 4px 3px 3px #aaaaaa',
    left: '0px 0px 0px 3px #aaaaaa',
    topRight: '4px 4px 0px 0px #aaaaaa',
    top: '4px 0px 0px 0px #aaaaaa',
    topLeft: '4px 0px 0px 3px #aaaaaa',
};

/**
 * @internal
 * "Italic" button on the format ribbon
 */
export const imageBoxShadow: RibbonButton<'buttonNameImageBoxSHadow'> = {
    key: 'buttonNameImageBoxSHadow',
    unlocalizedText: 'Image Shadow',
    iconName: 'Photo2',
    isDisabled: formatState => !formatState.isImageSelected,
    dropDownMenu: {
        items: STYLES_NAMES,
        allowLivePreview: true,
    },
    onClick: (editor, size) => {
        if (isContentModelEditor(editor)) {
            setImageBoxShadow(editor, STYLES[size]);
        }
        return true;
    },
};
