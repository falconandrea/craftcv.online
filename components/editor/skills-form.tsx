"use client";

/**
 * Skills Form Component
 *
 * Form for editing the skills section of the CV.
 * Uses a tag input approach with drag-and-drop reordering.
 */

import { useCVStore } from "@/state/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { GripVertical, AlertTriangle } from "lucide-react";
import { useState, KeyboardEvent, useMemo } from "react";
import { computeSkillEvidence } from "@/lib/cv/skill-evidence";

export function SkillsForm() {
  const cv = useCVStore();
  const { skills, setSkills, reorderSkills } = cv;
  const [inputValue, setInputValue] = useState("");

  const evidencedSkills = useMemo(() => computeSkillEvidence(cv), [cv]);
  
  const getSkillEvidence = (skillName: string) => {
    return evidencedSkills.find((s) => s.name === skillName);
  };
  
  const unevidencedSkills = evidencedSkills.filter(s => s.evidencedIn.length === 0);

  const handleAddSkill = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !skills.includes(trimmedValue)) {
      setSkills([...skills, trimmedValue]);
      setInputValue("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSkill();
    } else if (
      e.key === "Backspace" &&
      inputValue === "" &&
      skills.length > 0
    ) {
      // Remove the last skill when backspace is pressed on empty input
      setSkills(skills.slice(0, -1));
    }
  };

  const handleRemoveSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    reorderSkills(result.source.index, result.destination.index);
  };

  return (
    <div className="space-y-4">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="skills" direction="horizontal">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="flex flex-wrap gap-2"
            >
              {skills.map((skill, index) => (
                <Draggable
                  key={index}
                  draggableId={`skill-${index}`}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <Badge
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      variant="secondary"
                      className={`px-3 py-1 gap-2 ${
                        snapshot.isDragging ? "opacity-50" : ""
                      }`}
                    >
                      <div
                        {...provided.dragHandleProps}
                        className="cursor-grab text-zinc-400 hover:text-zinc-600"
                      >
                        <GripVertical className="h-3 w-3" />
                      </div>
                      
                      {(() => {
                        const evidence = getSkillEvidence(skill);
                        if (evidence && evidence.evidencedIn.length > 0) {
                           return <div className="h-2 w-2 rounded-full bg-emerald-500" title={`Found in ${evidence.evidencedIn.length} entries`} />
                        }
                        return <div className="h-2 w-2 rounded-full bg-amber-500" title="Listed but not found in any experience" />
                      })()}
                      
                      <span className="text-sm">{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(index)}
                        className="hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a skill and press Enter"
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleAddSkill}
          disabled={!inputValue.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {unevidencedSkills.length > 0 && (
        <div className="mt-6 rounded-md bg-amber-500/10 border border-amber-500/20 p-4">
          <div className="flex items-center gap-2 text-amber-500 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <h4 className="text-sm font-medium">Unevidenced Skills ({unevidencedSkills.length})</h4>
          </div>
          <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mb-3">
            These skills are listed but not found in any experience — recruiters may question them. Consider adding them to your experience descriptions or removing them.
          </p>
          <div className="flex flex-wrap gap-2">
            {unevidencedSkills.map((s, idx) => (
              <Badge key={idx} variant="outline" className="text-xs text-amber-600 border-amber-500/30">
                {s.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
