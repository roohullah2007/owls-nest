import CrmLayout from '@/Layouts/CrmLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

interface Stage {
    id: number;
    name: string;
    type: string;
    color: string | null;
    position: number;
}

interface Pipeline {
    id: number;
    name: string;
    is_default: boolean;
    position: number;
    stages: Stage[];
}

interface Props {
    pipelines: Pipeline[];
}

export default function PipelinesIndex({ pipelines }: Props) {
    const [editingPipeline, setEditingPipeline] = useState<number | null>(null);
    const pipelineForm = useForm({ name: '' });
    const stageForm = useForm({ name: '', type: 'open' as string, color: '#6366f1' });

    function handleCreatePipeline(e: React.FormEvent) {
        e.preventDefault();
        pipelineForm.post(route('crm.pipelines.store'), {
            preserveScroll: true,
            onSuccess: () => pipelineForm.reset(),
        });
    }

    function handleAddStage(e: React.FormEvent, pipelineId: number) {
        e.preventDefault();
        stageForm.post(route('crm.pipelines.stages.store', pipelineId), {
            preserveScroll: true,
            onSuccess: () => stageForm.reset(),
        });
    }

    function handleDeleteStage(pipelineId: number, stageId: number) {
        router.delete(route('crm.pipelines.stages.destroy', [pipelineId, stageId]), { preserveScroll: true });
    }

    function handleDeletePipeline(pipelineId: number) {
        if (confirm('Delete this pipeline? This cannot be undone.')) {
            router.delete(route('crm.pipelines.destroy', pipelineId), { preserveScroll: true });
        }
    }

    function handleSetDefault(pipelineId: number) {
        router.patch(route('crm.pipelines.update', pipelineId), { is_default: true }, { preserveScroll: true });
    }

    return (
        <CrmLayout>
            <Head title="Pipelines" />

            <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-lg font-semibold text-gray-900">Pipeline Settings</h1>
                </div>

                {/* Create pipeline */}
                <form onSubmit={handleCreatePipeline} className="mb-6 flex gap-2">
                    <input
                        type="text"
                        value={pipelineForm.data.name}
                        onChange={(e) => pipelineForm.setData('name', e.target.value)}
                        placeholder="New pipeline name"
                        className="flex-1 rounded-md border-gray-300 text-sm"
                        required
                    />
                    <button type="submit" disabled={pipelineForm.processing} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
                        Add Pipeline
                    </button>
                </form>

                {/* Pipelines list */}
                <div className="space-y-6">
                    {pipelines.map((pipeline) => (
                        <div key={pipeline.id} className="rounded-lg border border-gray-200 bg-white p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-semibold text-gray-900">{pipeline.name}</h2>
                                    {pipeline.is_default && (
                                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700">Default</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {!pipeline.is_default && (
                                        <button onClick={() => handleSetDefault(pipeline.id)} className="text-xs text-indigo-600 hover:text-indigo-500">
                                            Set Default
                                        </button>
                                    )}
                                    <button onClick={() => handleDeletePipeline(pipeline.id)} className="text-xs text-red-500 hover:text-red-600">
                                        Delete
                                    </button>
                                </div>
                            </div>

                            {/* Stages */}
                            <div className="space-y-2 mb-4">
                                {pipeline.stages.map((stage) => (
                                    <div key={stage.id} className="flex items-center justify-between rounded border border-gray-100 px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            {stage.color && (
                                                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
                                            )}
                                            <span className="text-sm text-gray-700">{stage.name}</span>
                                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                                stage.type === 'won' ? 'bg-green-100 text-green-700' :
                                                stage.type === 'lost' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                                {stage.type}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteStage(pipeline.id, stage.id)}
                                            className="text-xs text-gray-400 hover:text-red-500"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Add stage */}
                            <form onSubmit={(e) => handleAddStage(e, pipeline.id)} className="flex gap-2">
                                <input
                                    type="text"
                                    value={stageForm.data.name}
                                    onChange={(e) => stageForm.setData('name', e.target.value)}
                                    placeholder="Stage name"
                                    className="flex-1 rounded-md border-gray-300 text-sm"
                                    required
                                />
                                <select
                                    value={stageForm.data.type}
                                    onChange={(e) => stageForm.setData('type', e.target.value)}
                                    className="rounded-md border-gray-300 text-sm"
                                >
                                    <option value="open">Open</option>
                                    <option value="won">Won</option>
                                    <option value="lost">Lost</option>
                                </select>
                                <input
                                    type="color"
                                    value={stageForm.data.color}
                                    onChange={(e) => stageForm.setData('color', e.target.value)}
                                    className="h-9 w-9 rounded border-gray-300"
                                />
                                <button type="submit" className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">
                                    Add Stage
                                </button>
                            </form>
                        </div>
                    ))}
                </div>
            </div>
        </CrmLayout>
    );
}
