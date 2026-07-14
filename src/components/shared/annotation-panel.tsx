"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { UserAnnotation } from "@/lib/types";

interface AnnotationPanelProps {
  tableName: string;
  recordId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function AnnotationPanel({
  tableName,
  recordId,
  isOpen,
  onClose,
}: AnnotationPanelProps) {
  const supabase = createClient();
  const [annotations, setAnnotations] = useState<UserAnnotation[]>([]);
  const [myNote, setMyNote] = useState("");
  const [myTags, setMyTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isReviewed, setIsReviewed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) setUserId(session.user.id);

      const { data } = await supabase
        .from("user_annotations")
        .select("*, profiles(display_name, email)")
        .eq("table_name", tableName)
        .eq("record_id", recordId)
        .order("created_at", { ascending: false });

      if (data) {
        setAnnotations(data as UserAnnotation[]);
        const mine = data.find((a) => a.user_id === session?.user?.id);
        if (mine) {
          setMyNote(mine.note ?? "");
          setMyTags(mine.tags ?? []);
          setIsReviewed(mine.is_reviewed);
        } else {
          setMyNote("");
          setMyTags([]);
          setIsReviewed(false);
        }
      }
    }

    load();
  }, [isOpen, tableName, recordId, supabase]);

  async function handleSave() {
    if (!userId) return;
    setSaving(true);

    await supabase.from("user_annotations").upsert(
      {
        user_id: userId,
        table_name: tableName,
        record_id: recordId,
        note: myNote || null,
        tags: myTags.length > 0 ? myTags : null,
        is_reviewed: isReviewed,
      },
      { onConflict: "user_id,table_name,record_id" }
    );

    setSaving(false);
    onClose();
  }

  function addTag() {
    const tag = tagInput.trim();
    if (tag && !myTags.includes(tag)) {
      setMyTags([...myTags, tag]);
    }
    setTagInput("");
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-[450px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Notes & Tags</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6 px-4">
          <div>
            <Label>Note</Label>
            <Textarea
              value={myNote}
              onChange={(e) => setMyNote(e.target.value)}
              placeholder="Add a note..."
              rows={4}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Tags</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Type tag + Enter"
                className="flex-1"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {myTags.map((tag) => (
                <span
                  key={tag}
                  role="button"
                  tabIndex={0}
                  className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium cursor-pointer hover:bg-red-100 hover:text-red-800"
                  onClick={() => setMyTags(myTags.filter((t) => t !== tag))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setMyTags(myTags.filter((t) => t !== tag));
                    }
                  }}
                >
                  {tag} &times;
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="reviewed"
              checked={isReviewed}
              onCheckedChange={(checked) => setIsReviewed(checked === true)}
            />
            <Label htmlFor="reviewed">Mark as reviewed</Label>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save"}
          </Button>

          {annotations.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-semibold mb-3">All Notes</h3>
              {annotations.map((a) => (
                <div
                  key={a.id}
                  className="mb-3 p-3 bg-gray-50 rounded-lg text-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-[#1a1a2e]">
                      {a.profiles?.display_name ??
                        a.profiles?.email ??
                        "Unknown"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {a.note && <p className="text-gray-600">{a.note}</p>}
                  {a.tags && a.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {a.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {a.is_reviewed && (
                    <span className="text-[10px] text-green-600 font-semibold mt-1 inline-block">
                      REVIEWED
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
