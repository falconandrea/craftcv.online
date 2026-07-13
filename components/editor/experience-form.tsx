"use client";

/**
 * Experience Form Component
 *
 * Form for editing work experience entries.
 * Supports add, remove, update, and drag-and-drop reordering.
 */

import { useCVStore } from "@/state/store";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { MonthYearSelect } from "@/components/ui/month-year-select";
import {
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import type { ExperienceEntry } from "@/state/types";

const emptyEntry: ExperienceEntry = {
  company: "",
  role: "",
  startDate: "",
  endDate: null, // Present by default
  location: "",
  description: "",
};

export function ExperienceForm() {
  const {
    experience,
    addExperience,
    updateExperience,
    removeExperience,
    reorderExperience,
  } = useCVStore();

  const handleAddEntry = () => {
    addExperience({ ...emptyEntry });
    setTimeout(() => {
      const element = document.getElementById(`company-${experience.length}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.focus();
      }
    }, 100);
  };

  const handleUpdateEntry = (
    index: number,
    field: keyof ExperienceEntry,
    value: string | null,
  ) => {
    const entry = experience[index];
    updateExperience(index, { ...entry, [field]: value });
  };

  const handleRemoveEntry = (index: number) => {
    removeExperience(index);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    reorderExperience(result.source.index, result.destination.index);
  };

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        onClick={handleAddEntry}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Experience
      </Button>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="experience">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-4"
            >
              {experience.map((entry, index) => (
                <Draggable
                  key={index}
                  draggableId={`experience-${index}`}
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
                          {/* Company & Role — full width stacked */}
                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <Label htmlFor={`company-${index}`}>
                                Company
                              </Label>
                              <Input
                                id={`company-${index}`}
                                value={entry.company}
                                onChange={(e) =>
                                  handleUpdateEntry(
                                    index,
                                    "company",
                                    e.target.value,
                                  )
                                }
                                placeholder="Company Name"
                                className="mt-1"
                              />
                            </div>

                            <div>
                              <Label htmlFor={`role-${index}`}>Role</Label>
                              <Input
                                id={`role-${index}`}
                                value={entry.role}
                                onChange={(e) =>
                                  handleUpdateEntry(
                                    index,
                                    "role",
                                    e.target.value,
                                  )
                                }
                                placeholder="Job Title"
                                className="mt-1"
                              />
                            </div>
                          </div>

                          {/* TL;DR — full width */}
                          <div>
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`tldr-${index}`}>TL;DR (optional)</Label>
                              <span className="text-xs text-zinc-500">
                                {entry.tldr ? entry.tldr.split(/\s+/).filter(Boolean).length : 0}/30 words
                              </span>
                            </div>
                            <Input
                              id={`tldr-${index}`}
                              value={entry.tldr || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val.length <= 200) {
                                  handleUpdateEntry(index, "tldr", val);
                                }
                              }}
                              placeholder="One sentence: what it was, core tech, key result."
                              className="mt-1 text-zinc-600 dark:text-zinc-400"
                            />
                          </div>

                          {/* Start & End Date — stacked */}
                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <Label htmlFor={`startDate-${index}`} className='mb-1'>
                                Start Date
                              </Label>
                              <MonthYearSelect
                                value={entry.startDate || null}
                                onChange={(value) =>
                                  handleUpdateEntry(index, "startDate", value)
                                }
                              />
                            </div>

                            <div>
                              <Label htmlFor={`endDate-${index}`} className='mb-1'>
                                End Date
                              </Label>
                              <div className="flex items-center gap-2">
                                <MonthYearSelect
                                  value={entry.endDate || null}
                                  onChange={(value) =>
                                    handleUpdateEntry(index, "endDate", value)
                                  }
                                  disabled={entry.endDate === null}
                                />
                                <div className="flex items-center gap-2 whitespace-nowrap">
                                  <Checkbox
                                    id={`present-${index}`}
                                    checked={entry.endDate === null}
                                    onCheckedChange={(checked) => {
                                      handleUpdateEntry(
                                        index,
                                        "endDate",
                                        checked ? null : "",
                                      );
                                    }}
                                  />
                                  <Label
                                    htmlFor={`present-${index}`}
                                    className="cursor-pointer"
                                  >
                                    Present
                                  </Label>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Location — full width */}
                          <div>
                            <Label htmlFor={`location-${index}`}>
                              Location
                            </Label>
                            <Input
                              id={`location-${index}`}
                              value={entry.location || ""}
                              onChange={(e) =>
                                handleUpdateEntry(
                                  index,
                                  "location",
                                  e.target.value,
                                )
                              }
                              placeholder="City, Country"
                              className="mt-1"
                            />
                          </div>

                          {/* Description — full width */}
                          <div>
                            <Label htmlFor={`description-${index}`}>
                              Description
                            </Label>
                            <Textarea
                              id={`description-${index}`}
                              value={entry.description}
                              onChange={(e) =>
                                handleUpdateEntry(
                                  index,
                                  "description",
                                  e.target.value,
                                )
                              }
                              placeholder="Describe your responsibilities and achievements..."
                              rows={4}
                              className="mt-1"
                            />
                          </div>

                          <Separator />

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveEntry(index)}
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
