import { CheckCheck, ArrowRight, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import type { CVState, CVPatch } from "@/state/types";

interface AiDiffModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentCV: CVState;
    patch: CVPatch;
    onApply: () => void;
}

function DiffSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="border border-zinc-800/60 rounded-lg overflow-hidden mb-4">
            <div className="bg-[#050508] px-4 py-2 border-b border-zinc-800/60">
                <h4 className="font-mono text-xs text-[#00f0ff] uppercase tracking-wider">{title}</h4>
            </div>
            <div className="p-4 bg-[#0a0a12]">{children}</div>
        </div>
    );
}

function CompareBlock({ current, proposed }: { current: string | undefined; proposed: string | undefined }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-[#ff00aa] uppercase tracking-wider">── CURRENT</span>
                <div className="p-3 bg-[#ff00aa]/5 text-zinc-400 rounded text-sm min-h-[60px] whitespace-pre-wrap border border-[#ff00aa]/15 font-mono line-through decoration-[#ff00aa]/30">
                    {current || <span className="text-zinc-600 italic no-underline">Empty</span>}
                </div>
            </div>
            <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-[#b8ff00] uppercase tracking-wider">++ PROPOSED</span>
                <div className="p-3 bg-[#b8ff00]/5 text-[#b8ff00]/90 rounded text-sm min-h-[60px] whitespace-pre-wrap border border-[#b8ff00]/15 font-mono">
                    {proposed || <span className="text-zinc-600 italic">Empty</span>}
                </div>
            </div>
        </div>
    );
}

function CompareList({ items, renderItem }: { items: unknown[]; renderItem: (item: unknown) => React.ReactNode }) {
    if (!items || items.length === 0) return <div className="text-xs text-zinc-600 italic pb-2 font-mono">NULL</div>;
    return (
        <ul className="space-y-2">
            {items.map((item, i) => (
                <li key={i} className="p-3 bg-[#050508] border border-zinc-800/40 rounded text-sm font-mono text-zinc-300">
                    {renderItem(item)}
                </li>
            ))}
        </ul>
    );
}

interface ExperienceItem {
    role: string;
    company: string;
    startDate: string;
    endDate?: string | null;
    description: string;
}

interface EducationItem {
    degree: string;
    institution: string;
    year: string;
}

interface ProjectItem {
    name: string;
    role: string;
    description: string;
}

interface CertificationItem {
    title: string;
    issuer: string;
    year?: string;
}

export function AiDiffModal({ open, onOpenChange, currentCV, patch, onApply }: AiDiffModalProps) {
    const hasChanges = Object.keys(patch).length > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0 bg-[#0a0a12] border-zinc-700/50 text-white">
                <DialogHeader className="p-6 border-b border-zinc-800/60 bg-[#050508]">
                    <DialogTitle className="flex items-center gap-2 font-mono text-sm">
                        <Terminal className="w-4 h-4 text-[#00f0ff]" />
                        <span className="text-[#00f0ff]">&gt; DIFF_VIEWER</span>
                        <span className="text-xs font-normal px-2 py-0.5 rounded border border-[#b8ff00]/30 bg-[#b8ff00]/10 text-[#b8ff00] font-mono">
                            {Object.keys(patch).length} SECTIONS_MODIFIED
                        </span>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {!hasChanges && (
                        <div className="text-center py-8 text-zinc-600 font-mono text-sm">
                            NO_CHANGES_DETECTED
                        </div>
                    )}

                    {patch.summary !== undefined && (
                        <DiffSection title="Summary">
                            <CompareBlock current={currentCV.summary} proposed={patch.summary} />
                        </DiffSection>
                    )}

                    {patch.skills !== undefined && (
                        <DiffSection title="Skills">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[10px] font-mono text-[#ff00aa] uppercase tracking-wider block mb-2">── CURRENT</span>
                                    <div className="flex flex-wrap gap-1.5 p-3 bg-[#ff00aa]/5 border border-[#ff00aa]/15 rounded min-h-[60px]">
                                        {currentCV.skills.length > 0 ? currentCV.skills.map((s, i) => (
                                            <span key={i} className="px-2 py-1 text-xs bg-[#ff00aa]/10 text-[#ff00aa]/70 rounded font-mono line-through">{s}</span>
                                        )) : <span className="text-zinc-600 italic text-xs font-mono">NULL</span>}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[10px] font-mono text-[#b8ff00] uppercase tracking-wider block mb-2">++ PROPOSED</span>
                                    <div className="flex flex-wrap gap-1.5 p-3 bg-[#b8ff00]/5 border border-[#b8ff00]/15 rounded min-h-[60px]">
                                        {patch.skills.length > 0 ? patch.skills.map((s, i) => (
                                            <span key={i} className="px-2 py-1 text-xs bg-[#b8ff00]/10 text-[#b8ff00] rounded font-mono">{s}</span>
                                        )) : <span className="text-zinc-600 italic text-xs font-mono">NULL</span>}
                                    </div>
                                </div>
                            </div>
                        </DiffSection>
                    )}

                    {patch.experience !== undefined && (
                        <DiffSection title="Experience">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div>
                                    <span className="text-[10px] font-mono text-[#ff00aa] uppercase tracking-wider block mb-2">── CURRENT</span>
                                    <CompareList items={currentCV.experience} renderItem={(item) => {
                                        const exp = item as ExperienceItem;
                                        return (
                                            <div className="space-y-1">
                                                <div className="font-medium text-zinc-400 line-through decoration-[#ff00aa]/30">{exp.role} @ {exp.company}</div>
                                                <div className="text-xs text-zinc-600">{exp.startDate} - {exp.endDate || "Present"}</div>
                                                <div className="text-xs mt-2 whitespace-pre-wrap text-zinc-500">{exp.description}</div>
                                            </div>
                                        );
                                    }} />
                                </div>
                                <div>
                                    <span className="text-[10px] font-mono text-[#b8ff00] uppercase tracking-wider block mb-2">++ PROPOSED</span>
                                    <div className="relative">
                                        <div className="absolute -left-4 top-1/2 -translate-y-1/2 hidden xl:flex items-center justify-center w-8 h-8 rounded bg-[#b8ff00]/10 text-[#b8ff00] z-10 border border-[#b8ff00]/20">
                                            <ArrowRight className="w-4 h-4" />
                                        </div>
                                        <div className="p-3 bg-[#b8ff00]/5 border border-[#b8ff00]/15 rounded-lg">
                                            <CompareList items={patch.experience} renderItem={(item) => {
                                                const exp = item as ExperienceItem;
                                                return (
                                                    <div className="space-y-1">
                                                        <div className="font-medium text-[#b8ff00]">{exp.role} @ {exp.company}</div>
                                                        <div className="text-xs text-[#b8ff00]/60">{exp.startDate} - {exp.endDate || "Present"}</div>
                                                        <div className="text-xs mt-2 whitespace-pre-wrap text-[#b8ff00]/80">{exp.description}</div>
                                                    </div>
                                                );
                                            }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </DiffSection>
                    )}

                    {patch.education !== undefined && (
                        <DiffSection title="Education">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div>
                                    <span className="text-[10px] font-mono text-[#ff00aa] uppercase tracking-wider block mb-2">── CURRENT</span>
                                    <CompareList items={currentCV.education} renderItem={(item) => {
                                        const edu = item as EducationItem;
                                        return (
                                            <div className="space-y-1">
                                                <div className="font-medium text-zinc-400 line-through decoration-[#ff00aa]/30">{edu.degree}</div>
                                                <div className="text-xs text-zinc-600">{edu.institution} ({edu.year})</div>
                                            </div>
                                        );
                                    }} />
                                </div>
                                <div>
                                    <span className="text-[10px] font-mono text-[#b8ff00] uppercase tracking-wider block mb-2">++ PROPOSED</span>
                                    <div className="p-3 bg-[#b8ff00]/5 border border-[#b8ff00]/15 rounded-lg">
                                        <CompareList items={patch.education} renderItem={(item) => {
                                            const edu = item as EducationItem;
                                            return (
                                                <div className="space-y-1">
                                                    <div className="font-medium text-[#b8ff00]">{edu.degree}</div>
                                                    <div className="text-xs text-[#b8ff00]/60">{edu.institution} ({edu.year})</div>
                                                </div>
                                            );
                                        }} />
                                    </div>
                                </div>
                            </div>
                        </DiffSection>
                    )}

                    {patch.projects !== undefined && (
                        <DiffSection title="Projects">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div>
                                    <span className="text-[10px] font-mono text-[#ff00aa] uppercase tracking-wider block mb-2">── CURRENT</span>
                                    <CompareList items={currentCV.projects} renderItem={(item) => {
                                        const proj = item as ProjectItem;
                                        return (
                                            <div className="space-y-1">
                                                <div className="font-medium text-zinc-400 line-through decoration-[#ff00aa]/30">{proj.name}</div>
                                                <div className="text-xs text-zinc-600">{proj.role}</div>
                                                <div className="text-xs mt-2 whitespace-pre-wrap text-zinc-500">{proj.description}</div>
                                            </div>
                                        );
                                    }} />
                                </div>
                                <div>
                                    <span className="text-[10px] font-mono text-[#b8ff00] uppercase tracking-wider block mb-2">++ PROPOSED</span>
                                    <div className="p-3 bg-[#b8ff00]/5 border border-[#b8ff00]/15 rounded-lg">
                                        <CompareList items={patch.projects} renderItem={(item) => {
                                            const proj = item as ProjectItem;
                                            return (
                                                <div className="space-y-1">
                                                    <div className="font-medium text-[#b8ff00]">{proj.name}</div>
                                                    <div className="text-xs text-[#b8ff00]/60">{proj.role}</div>
                                                    <div className="text-xs mt-2 whitespace-pre-wrap text-[#b8ff00]/80">{proj.description}</div>
                                                </div>
                                            );
                                        }} />
                                    </div>
                                </div>
                            </div>
                        </DiffSection>
                    )}

                    {patch.certifications !== undefined && (
                        <DiffSection title="Certifications">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div>
                                    <span className="text-[10px] font-mono text-[#ff00aa] uppercase tracking-wider block mb-2">── CURRENT</span>
                                    <CompareList items={currentCV.certifications} renderItem={(item) => {
                                        const cert = item as CertificationItem;
                                        return (
                                            <div className="space-y-1">
                                                <div className="font-medium text-zinc-400 line-through decoration-[#ff00aa]/30">{cert.title}</div>
                                                <div className="text-xs text-zinc-600">{cert.issuer} {cert.year && `(${cert.year})`}</div>
                                            </div>
                                        );
                                    }} />
                                </div>
                                <div>
                                    <span className="text-[10px] font-mono text-[#b8ff00] uppercase tracking-wider block mb-2">++ PROPOSED</span>
                                    <div className="p-3 bg-[#b8ff00]/5 border border-[#b8ff00]/15 rounded-lg">
                                        <CompareList items={patch.certifications} renderItem={(item) => {
                                            const cert = item as CertificationItem;
                                            return (
                                                <div className="space-y-1">
                                                    <div className="font-medium text-[#b8ff00]">{cert.title}</div>
                                                    <div className="text-xs text-[#b8ff00]/60">{cert.issuer} {cert.year && `(${cert.year})`}</div>
                                                </div>
                                            );
                                        }} />
                                    </div>
                                </div>
                            </div>
                        </DiffSection>
                    )}

                    {patch.languages !== undefined && (
                        <DiffSection title="Languages">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[10px] font-mono text-[#ff00aa] uppercase tracking-wider block mb-2">── CURRENT</span>
                                    <div className="flex flex-wrap gap-2 p-3 bg-[#ff00aa]/5 border border-[#ff00aa]/15 rounded min-h-[60px]">
                                        {currentCV.languages.length > 0 ? currentCV.languages.map((l, i) => (
                                            <span key={i} className="px-2 py-1 text-xs bg-[#ff00aa]/10 text-[#ff00aa]/70 rounded font-mono border border-[#ff00aa]/15">
                                                <span className="font-medium">{l.language}</span> <span className="text-[#ff00aa]/50 ml-1">{l.proficiency}</span>
                                            </span>
                                        )) : <span className="text-zinc-600 italic text-xs font-mono">NULL</span>}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[10px] font-mono text-[#b8ff00] uppercase tracking-wider block mb-2">++ PROPOSED</span>
                                    <div className="flex flex-wrap gap-2 p-3 bg-[#b8ff00]/5 border border-[#b8ff00]/15 rounded min-h-[60px]">
                                        {patch.languages.length > 0 ? patch.languages.map((l, i) => (
                                            <span key={i} className="px-2 py-1 text-xs bg-[#b8ff00]/10 text-[#b8ff00] rounded font-mono border border-[#b8ff00]/15">
                                                <span className="font-medium">{l.language}</span> <span className="text-[#b8ff00]/60 ml-1">{l.proficiency}</span>
                                            </span>
                                        )) : <span className="text-zinc-600 italic text-xs font-mono">NULL</span>}
                                    </div>
                                </div>
                            </div>
                        </DiffSection>
                    )}

                    {patch.customSection !== undefined && (
                        <DiffSection title={`Custom Section: ${patch.customSection.title || currentCV.customSection.title || "Interests"}`}>
                            <div className="space-y-3">
                                <div>
                                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">TITLE</span>
                                    <CompareBlock current={currentCV.customSection.title} proposed={patch.customSection.title} />
                                </div>
                                <div>
                                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">CONTENT</span>
                                    <CompareBlock current={currentCV.customSection.content} proposed={patch.customSection.content} />
                                </div>
                            </div>
                        </DiffSection>
                    )}
                </div>

                <DialogFooter className="p-4 border-t border-zinc-800/60 bg-[#050508] flex flex-row justify-end items-center gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 font-mono text-xs"
                    >
                        CANCEL
                    </Button>
                    <Button
                        onClick={() => {
                            onApply();
                            onOpenChange(false);
                        }}
                        className="bg-[#b8ff00]/15 hover:bg-[#b8ff00]/25 text-[#b8ff00] border border-[#b8ff00]/30 gap-2 font-mono text-xs"
                    >
                        <CheckCheck className="w-4 h-4" />
                        APPLY_CHANGES
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
