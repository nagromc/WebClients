import type { AnyAction, Reducer } from 'redux';

import { isTrashed, itemEq } from '@proton/pass/lib/items/item.predicates';
import {
    bootSuccess,
    draftDiscard,
    draftSave,
    draftsGarbageCollect,
    emptyTrashSuccess,
    importItemsBatchSuccess,
    inviteAcceptSuccess,
    inviteCreationSuccess,
    itemAutofilled,
    itemCreationDismiss,
    itemCreationFailure,
    itemCreationIntent,
    itemCreationSuccess,
    itemDeleteFailure,
    itemDeleteIntent,
    itemDeleteSuccess,
    itemDeleteSync,
    itemEditDismiss,
    itemEditFailure,
    itemEditIntent,
    itemEditSuccess,
    itemEditSync,
    itemMoveFailure,
    itemMoveIntent,
    itemMoveSuccess,
    itemPinSuccess,
    itemRestoreFailure,
    itemRestoreIntent,
    itemRestoreSuccess,
    itemTrashFailure,
    itemTrashIntent,
    itemTrashSuccess,
    itemUnpinSuccess,
    itemUsedSync,
    restoreTrashSuccess,
    shareDeleteSync,
    shareLeaveSuccess,
    sharesSync,
    syncSuccess,
    vaultDeleteIntent,
    vaultDeleteSuccess,
    vaultMoveAllItemsSuccess,
} from '@proton/pass/store/actions';
import { sanitizeWithCallbackAction } from '@proton/pass/store/actions/with-callback';
import type { WrappedOptimisticState } from '@proton/pass/store/optimistic/types';
import { combineOptimisticReducers } from '@proton/pass/store/optimistic/utils/combine-optimistic-reducers';
import withOptimistic from '@proton/pass/store/optimistic/with-optimistic';
import type { ItemType } from '@proton/pass/types';
import { CONTENT_FORMAT_VERSION, type ItemRevision, ItemState, type UniqueItem } from '@proton/pass/types';
import { or } from '@proton/pass/utils/fp/predicates';
import { objectDelete } from '@proton/pass/utils/object/delete';
import { fullMerge, partialMerge } from '@proton/pass/utils/object/merge';
import { getEpoch } from '@proton/pass/utils/time/epoch';
import { toMap } from '@proton/shared/lib/helpers/object';

/** itemIds are only guaranteed to be unique per share not globally,
 * therefore we must index the item entries by `shareId`  */
export type ItemsByShareId = { [shareId: string]: { [itemId: string]: ItemRevision } };

export const withOptimisticItemsByShareId = withOptimistic<ItemsByShareId>(
    [
        {
            initiate: itemCreationIntent.optimisticMatch,
            fail: itemCreationFailure.optimisticMatch,
            revert: [itemCreationSuccess.optimisticMatch, itemCreationDismiss.optimisticMatch],
        },
        {
            initiate: itemEditIntent.optimisticMatch,
            fail: itemEditFailure.optimisticMatch,
            commit: itemEditSuccess.optimisticMatch,
            revert: itemEditDismiss.optimisticMatch,
        },
        {
            initiate: itemMoveIntent.optimisticMatch,
            commit: itemMoveSuccess.optimisticMatch,
            revert: itemMoveFailure.optimisticMatch,
        },
        {
            initiate: itemTrashIntent.optimisticMatch,
            commit: itemTrashSuccess.optimisticMatch,
            revert: itemTrashFailure.optimisticMatch,
        },
        {
            initiate: itemRestoreIntent.optimisticMatch,
            commit: itemRestoreSuccess.optimisticMatch,
            revert: itemRestoreFailure.optimisticMatch,
        },
        {
            initiate: itemDeleteIntent.optimisticMatch,
            commit: itemDeleteSuccess.optimisticMatch,
            revert: itemDeleteFailure.optimisticMatch,
        },
    ],
    (state = {}, action: AnyAction) => {
        if (bootSuccess.match(action) && action.payload?.items !== undefined) return action.payload.items;
        if (syncSuccess.match(action)) return action.payload.items;
        if (sharesSync.match(action)) return fullMerge(state, action.payload.items);

        if (itemCreationIntent.match(action)) {
            const { shareId, optimisticId, createTime, ...item } = action.payload;
            const optimisticItem = state?.[shareId]?.[optimisticId];

            /**
             * FIXME: we could rely on an optimistic revisionTime update
             * optimistically bump the revision number in the case of retries,
             * the correct revision number will be set on item creation success.
             * This allows this item to be correctly marked as failed.
             */
            return fullMerge(state, {
                [shareId]: {
                    [optimisticId]: {
                        itemId: optimisticId,
                        shareId: shareId,
                        revision: optimisticItem !== undefined ? optimisticItem.revision + 1 : 0,
                        data: item,
                        aliasEmail: item.type === 'alias' ? item.extraData.aliasEmail : null,
                        state: ItemState.Active,
                        createTime,
                        modifyTime: createTime,
                        pinned: false,
                        revisionTime: createTime,
                        lastUseTime: null,
                        contentFormatVersion: CONTENT_FORMAT_VERSION,
                    },
                },
            });
        }

        if (itemCreationSuccess.match(action)) {
            const { shareId, item, alias } = action.payload;

            return fullMerge(state, {
                [shareId]: {
                    ...(alias ? { [alias.itemId]: alias } : {}),
                    [item.itemId]: item,
                },
            });
        }

        if (importItemsBatchSuccess.match(action)) {
            const { shareId, items } = action.payload;
            return fullMerge(state, { [shareId]: toMap(items, 'itemId') });
        }

        if (itemTrashIntent.match(action)) {
            const {
                item: { itemId },
                shareId,
            } = action.payload;

            return partialMerge(state, { [shareId]: { [itemId]: { state: ItemState.Trashed } } });
        }

        if (itemRestoreIntent.match(action)) {
            const {
                item: { itemId },
                shareId,
            } = action.payload;

            return partialMerge(state, { [shareId]: { [itemId]: { state: ItemState.Active } } });
        }

        if (itemEditIntent.match(action)) {
            const { shareId, itemId, ...item } = action.payload;
            const { revision } = state[shareId][itemId];

            /**
             * FIXME: see `itemCreationIntent.match`
             * optimistically bump the revision number in the case of retries,
             * the correct revision number will be set on item edit success.
             * This allows this item to be correctly marked as failed.
             */
            return partialMerge(state, {
                [shareId]: { [itemId]: { data: item, revision: revision + 1 } },
            });
        }

        if (itemEditSuccess.match(action) || itemEditSync.match(action)) {
            const { shareId, item } = action.payload;
            const { itemId } = item;

            return fullMerge(state, { [shareId]: { [itemId]: item } });
        }

        if (itemUsedSync.match(action)) {
            const { shareId, itemId, lastUseTime } = action.payload;

            return partialMerge(state, { [shareId]: { [itemId]: { lastUseTime } } });
        }

        if (itemDeleteIntent.match(action)) {
            const { shareId, item } = action.payload;

            return { ...state, [shareId]: objectDelete(state[shareId], item.itemId) };
        }

        if (itemDeleteSync.match(action)) {
            const { shareId, itemId } = action.payload;

            return { ...state, [shareId]: objectDelete(state[shareId], itemId) };
        }

        /**
         * BE side and under the hood, moving an item
         * will delete the item and re-create a new one.
         * That's why we are relying on an optimisticId
         * on an `itemMoveIntent`. This is similar to
         * the `itemCreationIntent` flow with the extra
         * deletion of the item to be moved.
         */
        if (itemMoveIntent.match(action)) {
            const { item, optimisticId, shareId } = action.payload;
            return fullMerge(
                { ...state, [item.shareId]: objectDelete(state[item.shareId], item.itemId) },
                {
                    [shareId]: {
                        [optimisticId]: {
                            ...item,
                            shareId,
                            itemId: optimisticId,
                            modifyTime: getEpoch(),
                        },
                    },
                }
            );
        }

        if (itemMoveSuccess.match(action)) {
            const { item, shareId, optimisticId } = action.payload;
            return fullMerge(
                { ...state, [shareId]: objectDelete(state[item.shareId], optimisticId) },
                { [shareId]: { [item.itemId]: item } }
            );
        }

        if (itemPinSuccess.match(action)) {
            const { shareId, itemId } = action.payload;
            return partialMerge(state, { [shareId]: { [itemId]: { pinned: true } } });
        }

        if (itemUnpinSuccess.match(action)) {
            const { shareId, itemId } = action.payload;
            return partialMerge(state, { [shareId]: { [itemId]: { pinned: false } } });
        }

        if (inviteCreationSuccess.match(action) && action.payload.withVaultCreation) {
            const { item, shareId, movedItem } = action.payload;
            return fullMerge(
                { ...state, [item.shareId]: objectDelete(state[item.shareId], item.itemId) },
                { [shareId]: { [movedItem.itemId]: movedItem } }
            );
        }

        if (emptyTrashSuccess.match(action)) {
            return Object.fromEntries(
                Object.entries(state).map(([shareId, itemsById]) => [
                    shareId,
                    Object.entries(itemsById).reduce(
                        (reduction, [itemId, item]) =>
                            isTrashed(item) ? reduction : fullMerge(reduction, { [itemId]: item }),
                        {}
                    ),
                ])
            );
        }

        if (restoreTrashSuccess.match(action)) {
            return Object.fromEntries(
                Object.entries(state).map(([shareId, itemsById]) => [
                    shareId,
                    Object.fromEntries(
                        Object.entries(itemsById).map(([itemId, item]) => [
                            itemId,
                            isTrashed(item) ? partialMerge(item, { state: ItemState.Active }) : item,
                        ])
                    ),
                ])
            );
        }

        if (itemAutofilled.match(action)) {
            const { shareId, itemId } = action.payload;
            return partialMerge(state, { [shareId]: { [itemId]: { lastUseTime: getEpoch() } } });
        }

        if (vaultDeleteIntent.match(action)) {
            return objectDelete(state, action.payload.shareId);
        }

        if (vaultDeleteSuccess.match(action)) {
            return objectDelete(state, action.payload.shareId);
        }

        if (vaultMoveAllItemsSuccess.match(action)) {
            const { shareId, movedItems, destinationShareId } = action.payload;
            return fullMerge({ ...state, [shareId]: {} }, { [destinationShareId]: toMap(movedItems, 'itemId') });
        }

        if (or(shareDeleteSync.match, shareLeaveSuccess.match)(action)) {
            return objectDelete(state, action.payload.shareId);
        }

        if (inviteAcceptSuccess.match(action)) {
            return partialMerge(state, { [action.payload.share.shareId]: toMap(action.payload.items, 'itemId') });
        }

        return state;
    },
    { sanitizeAction: sanitizeWithCallbackAction }
);

export type ItemsByOptimisticId = { [optimisticId: string]: UniqueItem };

const itemsByOptimisticId: Reducer<ItemsByOptimisticId> = (state = {}, action) => {
    if (or(itemCreationSuccess.match, itemMoveSuccess.match, itemMoveFailure.match)(action)) {
        const { optimisticId, item } = action.payload;
        const { itemId, shareId } = item;

        return fullMerge(state, { [optimisticId]: { shareId, itemId } });
    }

    return state;
};

/** revision number is stored on the `EditDraft` type in order
 * to future-proof drafts v2 : this will allow detecting stale
 * draft entries if an item was updated while having a draft. */
export type DraftBase =
    | { mode: 'new'; type: ItemType }
    | { mode: 'edit'; itemId: string; shareId: string; revision: number };

export type Draft<V extends {} = any> = DraftBase & { formData: V };
export type EditDraft = Extract<Draft, { mode: 'edit' }>;
export type NewDraft = Extract<Draft, { mode: 'new' }>;

/** Draft state now supports pushing multiple entries so as to future-proof
 * drafts v2. In the extension, we are stil relying on a single active draft
 * and all drafts will be garbage collected on extension boot. This behaviour
 * does not make sense for the web-app and is unavailable for web. */
const draftsReducer: Reducer<Draft[]> = (state = [], action) => {
    /* Ensures only one new item draft exists and that we do not
     * have duplicates for item edit drafts */
    const sanitizeDrafts = (drafts: Draft[], draft: DraftBase) => {
        if (draft.mode === 'new') return drafts.filter(({ mode }) => mode !== 'new');
        else return drafts.filter((entry) => entry.mode === 'new' || !itemEq(draft)(entry));
    };

    if (draftSave.match(action)) return [action.payload, ...sanitizeDrafts(state, action.payload)];
    if (draftDiscard.match(action)) return sanitizeDrafts(state, action.payload);
    if (draftsGarbageCollect.match(action)) return [];

    return state;
};

export type ItemsState = {
    byShareId: WrappedOptimisticState<ItemsByShareId>;
    byOptimistcId: ItemsByOptimisticId;
    drafts: Draft[];
};

export default combineOptimisticReducers({
    byShareId: withOptimisticItemsByShareId.reducer,
    byOptimistcId: itemsByOptimisticId,
    drafts: draftsReducer,
});
