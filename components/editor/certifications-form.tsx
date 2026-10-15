"use client";

/**
 * Certifications Form Component
 *
 * Form for editing certifications entries.
 * Supports add, remove, update, and drag-and-drop reordering.
 */

import { useCVStore } from "@/state/store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { Certification } from "@/state/types";
import { markEditorStarted } from "@/lib/analytics";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

const emptyCertification: Certification = {
  title: "",
  issuer: "",
  year: "",
};

export function CertificationsForm() {
  const {
    certifications,
    addCertification,
    updateCertification,
    removeCertification,
    reorderCertifications,
  } = useCVStore();

  const handleAddCertification = () => {
    markEditorStarted();
    addCertification({ ...emptyCertification });
    setTimeout(() => {
      const element = document.getElementById(`cert-title-${certifications.length}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.focus();
      }
    }, 100);
  };

  const handleUpdateCertification = (
    index: number,
    field: keyof Certification,
    value: string,
  ) => {
    markEditorStarted();
    const cert = certifications[index];
    updateCertification(index, { ...cert, [field]: value });
  };

  const handleRemoveCertification = (index: number) => {
    markEditorStarted();
    removeCertification(index);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.source.index !== result.destination.index) markEditorStarted();
    reorderCertifications(result.source.index, result.destination.index);
  };

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        onClick={handleAddCertification}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Certification
      </Button>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="certifications">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-4"
            >
              {certifications.map((cert, index) => (
                <Draggable
                  key={index}
                  draggableId={`certification-${index}`}
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
                            <Label htmlFor={`cert-title-${index}`}>Title</Label>
                            <Input
                              id={`cert-title-${index}`}
                              value={cert.title}
                              onChange={(e) =>
                                handleUpdateCertification(
                                  index,
                                  "title",
                                  e.target.value,
                                )
                              }
                              placeholder="AWS Certified Solutions Architect"
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor={`cert-issuer-${index}`}>
                              Issuer
                            </Label>
                            <Input
                              id={`cert-issuer-${index}`}
                              value={cert.issuer}
                              onChange={(e) =>
                                handleUpdateCertification(
                                  index,
                                  "issuer",
                                  e.target.value,
                                )
                              }
                              placeholder="Amazon Web Services"
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor={`cert-year-${index}`}>Year</Label>
                            <Input
                              id={`cert-year-${index}`}
                              value={cert.year || ""}
                              onChange={(e) =>
                                handleUpdateCertification(
                                  index,
                                  "year",
                                  e.target.value,
                                )
                              }
                              placeholder="2023"
                              className="mt-1"
                            />
                          </div>

                          <Separator />

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCertification(index)}
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
