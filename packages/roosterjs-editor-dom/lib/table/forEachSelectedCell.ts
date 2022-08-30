import VTable from './VTable';
import { VCell } from 'roosterjs-editor-types';

/**
 * Executes an action to all the cells within the selection range.
 * @param callback action to apply on each selected cell
 * @returns the amount of cells modified
 */
export default function forEachSelectedCell(vTable: VTable, callback: (cell: VCell) => void): void {
    if (vTable.selection) {
        const { lastCell, firstCell } = vTable.selection;

        for (let y = firstCell.y; y <= lastCell.y; y++) {
            for (let x = firstCell.x; x <= lastCell.x; x++) {
                if (vTable.cells && vTable.cells[y][x]?.td) {
                    callback(vTable.cells[y][x]);
                }
            }
        }
    }
}
