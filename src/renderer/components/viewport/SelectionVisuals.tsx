/**
 * مكون العناصر المرئية للتحديد
 * Selection visuals component
 */

import React from 'react'
import { useSelection, useTools } from '../../hooks/useStore'
import { getToolManager } from '../../tools'
import { ContextMenu } from './ContextMenu'
import { ElementHighlight } from './ElementHighlight'
import { SelectionBox } from './SelectionBox'

export const SelectionVisuals: React.FC = () => {
  const { selectedElements, selectionState } = useSelection()
  const { activeTool } = useTools()

  // Get selection box and context menu data from SelectTool
  const toolManager = getToolManager()
  const selectTool = toolManager?.getTool('select') as any // Cast to access public methods

  const selectionBox = selectTool?.getSelectionBox?.()
  const contextMenu = selectTool?.getContextMenu?.()

  // Only show visuals when select tool is active
  if (activeTool !== 'select') {
    return null
  }

  return (
    <>
      {/* Selection box */}
      {selectionBox && (
        <SelectionBox
          start={selectionBox.start}
          end={selectionBox.end}
          visible={selectionBox.active}
          color="#00aaff"
          opacity={0.2}
        />
      )}

      {/* Element highlights for selected elements */}
      {selectedElements.map(element => (
        <ElementHighlight
          key={`selected-${element.id}`}
          element={element}
          type="selected"
          color="#00aaff"
          opacity={0.3}
          animated={true}
        />
      ))}

      {/* Element highlight for hovered element */}
      {selectionState.hoveredElement && (
        <ElementHighlight
          key={`hovered-${selectionState.hoveredElement}`}
          element={
            selectedElements.find(e => e.id === selectionState.hoveredElement)!
          }
          type="hovered"
          color="#ffaa00"
          opacity={0.2}
          animated={false}
        />
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          visible={contextMenu.visible}
          position={contextMenu.position}
          elements={contextMenu.elements}
          onClose={() => selectTool?.closeContextMenu?.()}
        />
      )}
    </>
  )
}
