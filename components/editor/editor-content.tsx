"use client";

import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PersonalInfoForm } from "@/components/editor/personal-info-form";
import { SummaryForm } from "@/components/editor/summary-form";
import { ExperienceForm } from "@/components/editor/experience-form";
import { SkillsForm } from "@/components/editor/skills-form";
import { CertificationsForm } from "@/components/editor/certifications-form";
import { ProjectsForm } from "@/components/editor/projects-form";
import { EducationForm } from "@/components/editor/education-form";
import { LanguagesForm } from "@/components/editor/languages-form";
import { CustomSectionForm } from "@/components/editor/custom-section-form";
import { EditorTopNav } from "@/components/editor/EditorTopNav";
import { useCVStore } from "@/state/store";
import { RotateCcw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface EditorContentProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

/** Cyber-styled section heading with descriptive subtitle */
function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-2 pb-2">
      <p className="text-zinc-500 font-mono text-[0.65rem] uppercase tracking-widest">
        SYSTEM // INPUT
      </p>
      <h2 className="text-white font-bold text-xl tracking-tight">
        {title}
      </h2>
      <p className="text-zinc-400 text-sm leading-relaxed max-w-md">
        {description}
      </p>
    </div>
  );
}

/** Tab descriptive texts */
const TAB_DESCRIPTIONS: Record<string, { title: string; description: string }> = {
  personal: {
    title: "Personal Information",
    description: "Initialize your profile parameters. These data points serve as the root object for your generated identity document.",
  },
  summary: {
    title: "Professional Summary",
    description: "Compose a concise overview of your career trajectory, key strengths, and professional identity.",
  },
  experience: {
    title: "Work Experience",
    description: "Document your professional history. Each entry captures a role, company, and key achievements.",
  },
  education: {
    title: "Education",
    description: "Add your academic credentials. Include degrees, institutions, and graduation dates.",
  },
  languages: {
    title: "Languages",
    description: "List the languages you speak and your proficiency level for each.",
  },
  skills: {
    title: "Skills",
    description: "Define your technical and soft skills. These are parsed by ATS systems for keyword matching.",
  },
  custom: {
    title: "Custom Section",
    description: "Add a custom section to highlight unique qualifications, volunteering, or other relevant information.",
  },
  projects: {
    title: "Side Projects",
    description: "Showcase personal or open-source projects that demonstrate your skills and initiative.",
  },
  certifications: {
    title: "Certifications",
    description: "Add professional certifications and credentials that validate your expertise.",
  },
};

export function EditorContent({ activeTab, onTabChange }: EditorContentProps) {
  const { resetCV } = useCVStore();

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Sticky nav: tabs + reset button */}
      <div className="sticky top-0 z-10 -mx-6 px-6 py-3 bg-[#0a0a12]/95 backdrop-blur-sm border-b border-zinc-800/40 flex flex-col gap-2">
        <EditorTopNav activeTab={activeTab} onTabChange={onTabChange} className="flex-1" />

        {/* Reset button */}
        <div className="flex shrink-0 justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-[#ff00aa] hover:text-[#ff00aa] hover:bg-[#ff00aa]/10 border-[#ff00aa]/20 hover:border-[#ff00aa]/40 font-mono text-xs h-7 px-2 bg-transparent"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                RESET_ALL
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-[#0a0a12] border-zinc-700/50 text-white">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-[#ff00aa] font-mono">⚠ CONFIRM_RESET</AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-400 font-mono text-xs">
                  This action cannot be undone. This will permanently delete all
                  data you have entered into the CV generator.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white font-mono text-xs">
                  CANCEL
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => resetCV()}
                  className="bg-[#ff00aa]/20 hover:bg-[#ff00aa]/30 text-[#ff00aa] border border-[#ff00aa]/30 font-mono text-xs"
                >
                  EXECUTE_RESET
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Form tabs — driven by activeTab from parent. forceMount keeps forms in DOM for instant switching */}
      <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-6">
        <TabsContent value="personal" forceMount className="space-y-6 data-[state=inactive]:hidden">
          <SectionHeader {...TAB_DESCRIPTIONS.personal} />
          <PersonalInfoForm />
        </TabsContent>

        <TabsContent value="summary" forceMount className="space-y-6 data-[state=inactive]:hidden">
          <SectionHeader {...TAB_DESCRIPTIONS.summary} />
          <SummaryForm />
        </TabsContent>

        <TabsContent value="experience" forceMount className="space-y-6 data-[state=inactive]:hidden">
          <SectionHeader {...TAB_DESCRIPTIONS.experience} />
          <ExperienceForm />
        </TabsContent>

        <TabsContent value="education" forceMount className="space-y-6 data-[state=inactive]:hidden">
          <SectionHeader {...TAB_DESCRIPTIONS.education} />
          <EducationForm />
        </TabsContent>

        <TabsContent value="languages" forceMount className="space-y-6 data-[state=inactive]:hidden">
          <SectionHeader {...TAB_DESCRIPTIONS.languages} />
          <LanguagesForm />
        </TabsContent>

        <TabsContent value="skills" forceMount className="space-y-6 data-[state=inactive]:hidden">
          <SectionHeader {...TAB_DESCRIPTIONS.skills} />
          <SkillsForm />
        </TabsContent>

        <TabsContent value="custom" forceMount className="space-y-6 data-[state=inactive]:hidden">
          <SectionHeader {...TAB_DESCRIPTIONS.custom} />
          <CustomSectionForm />
        </TabsContent>

        <TabsContent value="projects" forceMount className="space-y-6 data-[state=inactive]:hidden">
          <SectionHeader {...TAB_DESCRIPTIONS.projects} />
          <ProjectsForm />
        </TabsContent>

        <TabsContent value="certifications" forceMount className="space-y-6 data-[state=inactive]:hidden">
          <SectionHeader {...TAB_DESCRIPTIONS.certifications} />
          <CertificationsForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
