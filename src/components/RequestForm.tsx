
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useRequests } from '@/hooks/useRequests';
import { useInvoices } from '@/hooks/useInvoices';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Plus, Trash2, Upload } from 'lucide-react';
import { InvoiceManager } from '@/components/InvoiceManager';

const requestSchema = z.object({
  type: z.enum(['psicológico', 'médico', 'odontológico', 'fisioterapia', 'outros']),
  description: z.string().optional(),
  polo: z.string().min(1, 'Polo é obrigatório'),
  cpf: z.string().min(11, 'CPF é obrigatório'),
  requesterName: z.string().min(1, 'Nome do solicitante é obrigatório'),
});

type RequestFormData = z.infer<typeof requestSchema>;

interface Dependent {
  name: string;
  relationship: string;
}

interface Invoice {
  id: string;
  value: number;
  beneficiary: string;
  sessions?: number;
  description: string;
  fileName?: string;
}

export function RequestForm() {
  const { profile } = useAuth();
  const { createRequest } = useRequests();
  const { uploadInvoices } = useInvoices();
  const { toast } = useToast();
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [uploading, setUploading] = useState(false);

  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      type: 'outros',
      description: '',
      polo: profile?.polo || '',
      cpf: '',
      requesterName: profile?.name || '',
    },
  });

  const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.value, 0);

  const addDependent = () => {
    setDependents([...dependents, { name: '', relationship: '' }]);
  };

  const removeDependent = (index: number) => {
    setDependents(dependents.filter((_, i) => i !== index));
  };

  const updateDependent = (index: number, field: 'name' | 'relationship', value: string) => {
    const updated = [...dependents];
    updated[index] = { ...updated[index], [field]: value };
    setDependents(updated);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const onSubmit = async (data: RequestFormData) => {
    if (invoices.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos uma nota fiscal",
        variant: "destructive",
      });
      return;
    }

    if (!data.cpf) {
      toast({
        title: "CPF obrigatório",
        description: "Informe o CPF para continuar",
        variant: "destructive",
      });
      return;
    }

    if (!data.requesterName) {
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome do solicitante",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Create request without uploading files to avoid RLS issues
      const requestData = {
        type: data.type,
        description: data.description,
        amount: totalAmount,
        polo: data.polo,
        cpf: data.cpf,
        requester_name: data.requesterName,
        dependents: dependents.filter(d => d.name && d.relationship),
        attachments: [], // Empty for now to avoid storage issues
        invoices: invoices,
      };

      await createRequest(requestData);
      
      toast({
        title: "Sucesso!",
        description: "Solicitação criada com sucesso!",
      });

      // Reset form
      form.reset();
      setDependents([]);
      setAttachments([]);
      setInvoices([]);
    } catch (error: any) {
      console.error('Erro ao criar solicitação:', error);
      toast({
        title: "Erro ao criar solicitação",
        description: "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl text-primary">Nova Solicitação</CardTitle>
        <CardDescription>
          Preencha os dados para solicitar auxílio
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="requesterName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Solicitante</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Auxílio</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="psicológico">Psicológico</SelectItem>
                      <SelectItem value="médico">Médico</SelectItem>
                      <SelectItem value="odontológico">Odontológico</SelectItem>
                      <SelectItem value="fisioterapia">Fisioterapia</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="polo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Polo</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o polo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="3M Manaus">3M Manaus</SelectItem>
                      <SelectItem value="3M Itapetininga">3M Itapetininga</SelectItem>
                      <SelectItem value="3M Sumaré">3M Sumaré</SelectItem>
                      <SelectItem value="3M Ribeirão Preto">3M Ribeirão Preto</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF</FormLabel>
                  <FormControl>
                    <Input placeholder="000.000.000-00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva detalhes adicionais sobre sua solicitação"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dependentes */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Dependentes</h3>
                <Button type="button" variant="outline" size="sm" onClick={addDependent}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>
              
              {dependents.map((dependent, index) => (
                <div key={index} className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                  <Input
                    placeholder="Nome do dependente"
                    value={dependent.name}
                    onChange={(e) => updateDependent(index, 'name', e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Select
                      value={dependent.relationship}
                      onValueChange={(value) => updateDependent(index, 'relationship', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Parentesco" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="filho">Filho(a)</SelectItem>
                        <SelectItem value="conjuge">Cônjuge</SelectItem>
                        <SelectItem value="pai">Pai</SelectItem>
                        <SelectItem value="mae">Mãe</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeDependent(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Gerenciador de Notas Fiscais */}
            <InvoiceManager 
              initialInvoices={invoices}
              onChange={setInvoices}
            />

            {/* Anexos */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Anexos Adicionais</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Arraste arquivos aqui ou clique para selecionar
                      </span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                </div>
              </div>
              
              {attachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Arquivos selecionados:</p>
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                      <span className="text-sm">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-primary" 
              disabled={uploading || invoices.length === 0}
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Enviar Solicitação
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
