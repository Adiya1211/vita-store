"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Eye, EyeOff, Trash2 } from "lucide-react";

interface FieldConfig {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  isVisible: boolean;
  isRequired: boolean;
  visibleToStaff: boolean;
  sortOrder: number;
  isCustom: boolean;
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  TEXT: "Текст",
  NUMBER: "Тоо",
  DATE: "Огноо",
  IMAGE: "Зураг",
  SELECT: "Сонголт",
  USER_SELECT: "Хэрэглэгч",
};

export default function AdminFieldsPage() {
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [open, setOpen] = useState(false);
  const [newField, setNewField] = useState({
    label: "",
    fieldKey: "",
    fieldType: "TEXT",
    isRequired: false,
  });
  const [saving, setSaving] = useState(false);

  async function loadFields() {
    const data = await fetch("/api/fields").then((r) => r.json());
    setFields(data);
  }

  useEffect(() => {
    loadFields();
  }, []);

  async function toggleVisible(f: FieldConfig) {
    await fetch("/api/fields", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: f.id, isVisible: !f.isVisible, label: f.label, isRequired: f.isRequired, sortOrder: f.sortOrder }),
    });
    loadFields();
  }

  async function toggleRequired(f: FieldConfig) {
    await fetch("/api/fields", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: f.id, isVisible: f.isVisible, label: f.label, isRequired: !f.isRequired, sortOrder: f.sortOrder, visibleToStaff: f.visibleToStaff }),
    });
    loadFields();
  }

  async function toggleStaffVisibility(f: FieldConfig) {
    await fetch("/api/fields", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: f.id, isVisible: f.isVisible, label: f.label, isRequired: f.isRequired, sortOrder: f.sortOrder, visibleToStaff: !f.visibleToStaff }),
    });
    loadFields();
  }

  async function deleteField(id: string) {
    if (!confirm("Энэ талбарыг устгах уу?")) return;
    await fetch(`/api/fields?id=${id}`, { method: "DELETE" });
    loadFields();
  }

  async function handleAdd() {
    setSaving(true);
    const key = newField.fieldKey || newField.label.toLowerCase().replace(/\s+/g, "_");
    await fetch("/api/fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: newField.label,
        fieldKey: key,
        fieldType: newField.fieldType,
        isRequired: newField.isRequired,
        sortOrder: fields.length + 1,
      }),
    });
    setSaving(false);
    setOpen(false);
    setNewField({ label: "", fieldKey: "", fieldType: "TEXT", isRequired: false });
    loadFields();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Талбар тохируулга</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Бүртгэлийн формын талбаруудыг удирдах
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} className="mr-1" />
          Талбар нэмэх
        </Button>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Талбарын нэр</TableHead>
              <TableHead>Түлхүүр</TableHead>
              <TableHead>Төрөл</TableHead>
              <TableHead title="Нийт харагдах эсэх">Нийт</TableHead>
              <TableHead title="Борлуулагчид харагдах эсэх">Борлуулагч</TableHead>
              <TableHead>Заавал</TableHead>
              <TableHead>Ангилал</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((f, i) => (
              <TableRow key={f.id} className={!f.isVisible ? "opacity-50" : ""}>
                <TableCell className="text-gray-400 text-sm">{i + 1}</TableCell>
                <TableCell className="font-medium">{f.label}</TableCell>
                <TableCell className="font-mono text-sm text-gray-500">{f.fieldKey}</TableCell>
                <TableCell className="text-sm">{FIELD_TYPE_LABELS[f.fieldType] || f.fieldType}</TableCell>
                <TableCell>
                  <button
                    onClick={() => toggleVisible(f)}
                    className="text-gray-500 hover:text-gray-800 transition-colors"
                    title={f.isVisible ? "Нуух" : "Харуулах"}
                  >
                    {f.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => toggleStaffVisibility(f)}
                    className="text-gray-500 hover:text-gray-800 transition-colors"
                    title={f.visibleToStaff ? "Борлуулагчаас нуух" : "Борлуулагчид харуулах"}
                  >
                    {f.visibleToStaff ? (
                      <Eye size={16} className="text-blue-500" />
                    ) : (
                      <EyeOff size={16} className="text-gray-300" />
                    )}
                  </button>
                </TableCell>
                <TableCell>
                  <button onClick={() => toggleRequired(f)} className="text-sm">
                    {f.isRequired ? (
                      <Badge variant="destructive" className="text-xs">Заавал</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Сонголттой</Badge>
                    )}
                  </button>
                </TableCell>
                <TableCell>
                  {f.isCustom ? (
                    <Badge variant="outline" className="text-xs">Нэмэлт</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Суурь</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {f.isCustom && (
                    <button
                      onClick={() => deleteField(f.id)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Шинэ талбар нэмэх</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Талбарын нэр (Монгол)</Label>
              <Input
                placeholder="Жишээ: Нийлүүлэгч"
                value={newField.label}
                onChange={(e) => setNewField((p) => ({ ...p, label: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Түлхүүр (автомат)</Label>
              <Input
                placeholder="supplier (автоматаар үүснэ)"
                value={newField.fieldKey}
                onChange={(e) => setNewField((p) => ({ ...p, fieldKey: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Өгөгдлийн төрөл</Label>
              <Select
                value={newField.fieldType}
                onValueChange={(v) => setNewField((p) => ({ ...p, fieldType: v as string }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEXT">Текст</SelectItem>
                  <SelectItem value="NUMBER">Тоо</SelectItem>
                  <SelectItem value="DATE">Огноо</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Цуцлах
            </Button>
            <Button onClick={handleAdd} disabled={!newField.label || saving}>
              {saving ? "Хадгалж байна..." : "Нэмэх"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
