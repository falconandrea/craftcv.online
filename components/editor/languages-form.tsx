"use client";

import { useCVStore } from "@/state/store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import {
    DragDropContext,
    Droppable,
    Draggable,
    DropResult,
} from "@hello-pangea/dnd";
import type { Language } from "@/state/types";
import { markEditorStarted } from "@/lib/analytics";

export function LanguagesForm() {
    const {
        languages,
        addLanguage,
        updateLanguage,
        removeLanguage,
        reorderLanguages,
    } = useCVStore();

    const handleAddLanguage = () => {
        markEditorStarted();
        addLanguage({ language: "", proficiency: "Intermediate" });
        setTimeout(() => {
            const element = document.getElementById(`language-${languages.length}`);
            if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
                element.focus();
            }
        }, 100);
    };

    const handleUpdateLanguage = (
        index: number,
        field: keyof Language,
        value: string
    ) => {
        markEditorStarted();
        const entry = languages[index];
        updateLanguage(index, { ...entry, [field]: value });
    };

    const handleRemoveLanguage = (index: number) => {
        markEditorStarted();
        removeLanguage(index);
    };

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        if (result.source.index !== result.destination.index) markEditorStarted();
        reorderLanguages(result.source.index, result.destination.index);
    };

    return (
        <div className="space-y-4">
            <Button
                type="button"
                variant="outline"
                onClick={handleAddLanguage}
                className="w-full"
            >
                <Plus className="h-4 w-4 mr-2" />
                Add Language
            </Button>

            <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="languages">
                    {(provided) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="space-y-4"
                        >
                            {languages.map((entry, index) => (
                                <Draggable
                                    key={index}
                                    draggableId={`language-${index}`}
                                    index={index}
                                >
                                    {(provided, snapshot) => (
                                        <Card
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className={`p-4 ${snapshot.isDragging ? "opacity-50" : ""}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    {...provided.dragHandleProps}
                                                    className="cursor-grab text-zinc-400 hover:text-zinc-600"
                                                >
                                                    <GripVertical className="h-5 w-5" />
                                                </div>

                                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <Label htmlFor={`language-${index}`}>Language</Label>
                                                        <Input
                                                            id={`language-${index}`}
                                                            value={entry.language}
                                                            onChange={(e) =>
                                                                handleUpdateLanguage(
                                                                    index,
                                                                    "language",
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="e.g. English, French"
                                                            className="mt-1"
                                                        />
                                                    </div>

                                                    <div>
                                                        <Label htmlFor={`proficiency-${index}`}>Proficiency</Label>
                                                        <Select
                                                            value={entry.proficiency}
                                                            onValueChange={(value) =>
                                                                handleUpdateLanguage(index, "proficiency", value)
                                                            }
                                                        >
                                                            <SelectTrigger className="mt-1">
                                                                <SelectValue placeholder="Select proficiency" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Native">Native</SelectItem>
                                                                <SelectItem value="Fluent">Fluent</SelectItem>
                                                                <SelectItem value="Advanced">Advanced</SelectItem>
                                                                <SelectItem value="Intermediate">Intermediate</SelectItem>
                                                                <SelectItem value="Basic">Basic</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveLanguage(index)}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-6"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
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
