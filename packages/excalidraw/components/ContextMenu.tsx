import clsx from "clsx";
import React from "react";

import { getShortcutFromShortcutName } from "../actions/shortcuts";
import { t } from "../i18n";

import { useExcalidrawAppState, useExcalidrawElements, useExcalidrawSetAppState } from "./App";

import { Popover } from "./Popover";

import "./ContextMenu.scss";

import type { ActionManager } from "../actions/manager";
import type { ShortcutName } from "../actions/shortcuts";
import type { Action } from "../actions/types";

import type { TranslationKeys } from "../i18n";
import scene from "@excalidraw/element/Scene";
import { ExcalidrawTextElement } from "@excalidraw/element/types";

type ContextMenuLiteral = typeof CONTEXT_MENU_SEPARATOR | typeof CONTEXT_MENU_UNDO | typeof  CONTEXT_MENU_REDO

export type ContextMenuItem = ContextMenuLiteral | Action;

export type ContextMenuItems = (ContextMenuItem | false | null | undefined)[];

type ContextMenuProps = {
  passthrough: any
  scene: scene;
  actionManager: ActionManager;
  items: ContextMenuItems;
  top: number;
  left: number;
  onClose: (callback?: () => void) => void;
};

export const CONTEXT_MENU_SEPARATOR = "separator";
export const CONTEXT_MENU_UNDO = "undo";
export const CONTEXT_MENU_REDO = "redo";

const CONTEXT_MENU_LITERALS = new Set<ContextMenuLiteral>([
  CONTEXT_MENU_SEPARATOR,
  CONTEXT_MENU_UNDO,
  CONTEXT_MENU_REDO,
])

export const ContextMenu = React.memo(
  ({ scene, actionManager, items, top, left, onClose, passthrough }: ContextMenuProps) => {
    const appState = useExcalidrawAppState();
    const elements = useExcalidrawElements();

    const filteredItems = items.reduce((acc: ContextMenuItem[], item) => {
      if (
        item &&
        // @ts-ignore
        (CONTEXT_MENU_LITERALS.has(item) || !item.predicate || item.predicate(
            elements,
            appState,
            actionManager.app.props,
            actionManager.app,
          ))
      ) {
        acc.push(item);
      }
      return acc;
    }, []);


    const selectedIds = Object.keys(appState.selectedElementIds)
    const selectedTextElement= selectedIds.length === 1
      ? elements.find(el => el.type === 'text' && el.id === selectedIds[0]) as ExcalidrawTextElement | undefined
      : null

    return (
      <Popover
        onCloseRequest={() => {
          onClose();
        }}
        top={top}
        left={left}
        fitInViewport={true}
        offsetLeft={appState.offsetLeft}
        offsetTop={appState.offsetTop}
        viewportWidth={appState.width}
        viewportHeight={appState.height}
      >
        <ul
          className="context-menu"
          onContextMenu={(event) => event.preventDefault()}
        >
          {
            // type: 'text' 类型的元素修改后需要调用 App 上的 handleTextWysiwyg 方法立即更新元素
            selectedTextElement && (
              <>
                <button
                  type="button" className="context-menu-item"
                  onClick={() => {
                      onClose(() => {
                        const originalText = selectedTextElement.originalText || selectedTextElement.text;
                        const newText = originalText + `\n${new Date().toLocaleDateString()}`;
                        scene.mutateElement(selectedTextElement, {originalText: newText, text: newText})
                        passthrough(selectedTextElement, {isExistingElement: true})
                      })
                  }}>
                  插入当前时间
                </button>
              </>
            )
          }
          {filteredItems.map((item, idx) => {
            if (item === CONTEXT_MENU_SEPARATOR) {
              if (
                !filteredItems[idx - 1] ||
                filteredItems[idx - 1] === CONTEXT_MENU_SEPARATOR
              ) {
                return null;
              }
              return <hr key={idx} className="context-menu-item-separator" />;
            }

            if (item === CONTEXT_MENU_UNDO) {
              return (
                <button
                  key={idx} type="button" className="context-menu-item"
                  onClick={() => {
                    onClose(() => {
                      actionManager.executeRegisteredAction('undo', "contextMenu");
                    });
                  }}>
                  <div className="context-menu-item__label">{t("buttons.undo")}</div>
                  <kbd className="context-menu-item__shortcut">Cmd+Z</kbd>
                </button>
              )
            }

            if (item === CONTEXT_MENU_REDO) {
              return (
                <button
                  key={idx} type="button" className="context-menu-item"
                  onClick={() => {
                    onClose(() => {
                      actionManager.executeRegisteredAction('redo', "contextMenu");
                    });
                  }}>
                  <div className="context-menu-item__label">{t("buttons.redo")}</div>
                  <kbd className="context-menu-item__shortcut">Cmd+Shift+Z</kbd>
                </button>
              )
            }

            const actionName = item.name;
            let label = "";
            if (item.label) {
              if (typeof item.label === "function") {
                label = t(
                  item.label(
                    elements,
                    appState,
                    actionManager.app,
                  ) as unknown as TranslationKeys,
                );
              } else {
                label = t(item.label as unknown as TranslationKeys);
              }
            }

            return (
              <li
                key={idx}
                data-testid={actionName}
                onClick={() => {
                  // we need update state before executing the action in case
                  // the action uses the appState it's being passed (that still
                  // contains a defined contextMenu) to return the next state.
                  onClose(() => {
                    actionManager.executeAction(item, "contextMenu");
                  });
                }}
              >
                <button
                  type="button"
                  className={clsx("context-menu-item", {
                    dangerous: actionName === "deleteSelectedElements",
                    checkmark: item.checked?.(appState),
                  })}
                >
                  <div className="context-menu-item__label">{label}</div>
                  <kbd className="context-menu-item__shortcut">
                    {actionName
                      ? getShortcutFromShortcutName(actionName as ShortcutName)
                      : ""}
                  </kbd>
                </button>
              </li>
            );
          })}
        </ul>
      </Popover>
    );
  },
);
