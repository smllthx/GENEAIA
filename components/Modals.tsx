"use client";

import { Building2, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function AddTransactionModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="glass"><Plus className="h-4 w-4" />Registrar pago</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pago rápido</DialogTitle>
          <DialogDescription>Registra un movimiento manual o Apple Pay demo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Comercio" />
          <Input placeholder="Monto" type="number" />
          <Input placeholder="Categoría" />
          <Button className="w-full">Guardar demo</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ConnectBankModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button><Building2 className="h-4 w-4" />Conectar banco</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conexión bancaria segura</DialogTitle>
          <DialogDescription>
            Tus conexiones bancarias son solo de lectura. Wallet no puede transferir dinero ni mover fondos. Esta app no debe guardar tus credenciales bancarias.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {["SimpleFIN Bridge", "Fintoc Chile", "Plaid", "GoCardless", "SaltEdge", "TrueLayer", "Tink"].map((provider) => (
            <Button key={provider} variant="glass" className="justify-start">
              {provider}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AppleWalletImportModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="glass"><Upload className="h-4 w-4" />Apple Wallet Sync</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apple Wallet Sync</DialogTitle>
          <DialogDescription>
            Importa CSV, agrega pagos Apple Pay manuales y deja preparado un Shortcut futuro.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Button variant="glass">Importar CSV</Button>
          <Button variant="glass">Agregar Apple Pay manual</Button>
          <Button variant="glass">Registrar pago rápido</Button>
          <p className="rounded-2xl bg-white/50 p-3 text-sm text-muted-foreground dark:bg-white/8">
            Como web app no puede sincronizar Apple Wallet completo; la arquitectura queda lista para PWA, CSV y Shortcuts.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
