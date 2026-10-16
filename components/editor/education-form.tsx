"use client";

/**
 * Education Form Component
 *
 * Form for editing education entries.
 * Supports add, remove, update, and drag-and-drop reordering.
 */

import { useCVStore } from "@/state/store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { Education } from "@/state/types";
import { markEditorStarted } from "@/lib/analytics";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

const emptyEducation: Education = {
  degree: "",
  institution: "",
  location: "",
  year: "",
};

export function EducationForm() {
  const {
    education,
    addEducation,
    updateEducation,
    removeEducation,
    reorderEducation,
  } = useCVStore();

  const handleAddEducation = () => {
    markEditorStarted();
    addEducation({ ...emptyEducation });
    setTimeout(() => {
      const element = document.getElementById(`edu-degree-${education.length}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.focus();
      }
    }, 100);
  };

  const handleUpdateEducation = (
    index: number,
    field: keyof Education,
    value: string,
  ) => {
    markEditorStarted();
    const edu = education[index];
    updateEducation(index, { ...edu, [field]: value });
  };

  const handleRemoveEducation = (index: number) => {
    markEditorStarted();
    removeEducation(index);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.source.index !== result.destination.index) markEditorStarted();
    reorderEducation(result.source.index, result.destination.index);
  };

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        onClick={handleAddEducation}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Education
      </Button>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="education">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-4"
            >
              {education.map((edu, index) => (
                <Draggable
                  key={index}
                  draggableId={`education-${index}`}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`p-4 ${snapshot.isDragging ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          {...provided.dragHandleProps}
                          className="mt-8 cursor-grab text-zinc-400 hover:text-zinc-600"
                        >
                          <GripVertical className="h-5 w-5" />
                        </div>

                        <div className="flex-1 space-y-3">
                          <div>
                            <Label htmlFor={`edu-degree-${index}`}>
                              Degree
                            </Label>
                            <Input
                              id={`edu-degree-${index}`}
                              value={edu.degree}
                              onChange={(e) =>
                                handleUpdateEducation(
                                  index,
                                  "degree",
                                  e.target.value,
                                )
                              }
                              placeholder="Bachelor of Science in Computer Science"
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor={`edu-institution-${index}`}>
                              Institution
                            </Label>
                            <Input
                              id={`edu-institution-${index}`}
                              value={edu.institution}
                              onChange={(e) =>
                                handleUpdateEducation(
                                  index,
                                  "institution",
                                  e.target.value,
                                )
                              }
                              placeholder="University Name"
                              className="mt-1"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor={`edu-location-${index}`}>
                                Location
                              </Label>
                              <Input
                                id={`edu-location-${index}`}
                                value={edu.location}
                                onChange={(e) =>
                                  handleUpdateEducation(
                                    index,
                                    "location",
                                    e.target.value,
                                  )
                                }
                                placeholder="City, Country"
                                className="mt-1"
                              />
                            </div>

                            <div>
                              <Label htmlFor={`edu-year-${index}`}>Year</Label>
                              <Input
                                id={`edu-year-${index}`}
                                value={edu.year}
                                onChange={(e) =>
                                  handleUpdateEducation(
                                    index,
                                    "year",
                                    e.target.value,
                                  )
                                }
                                placeholder="2020"
                                className="mt-1"
                              />
                            </div>
                          </div>

                          <Separator />

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveEducation(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove Entry
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
