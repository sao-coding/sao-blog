"use client";
import { ModalProvider } from "@/components/providers/modal-provider";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useModalStack } from "@/hooks/use-modal-stack";
import { tagFormSchema } from "@/schemas/tag";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import z from "zod";

const modeConfig = {
	create: {
		method: "POST",
		title: "建立標籤",
		description: "建立新的標籤，讓讀者更容易找到相關內容",
		submitButtonText: "建立",
		submittingButtonText: "建立中...",
	},
	edit: {
		method: "PUT",
		title: "編輯標籤",
		description: "修改標籤資訊，保持內容的組織性",
		submitButtonText: "儲存變更",
		submittingButtonText: "儲存中...",
	},
}

function TagFormDialog({ mode }: { mode: "create" | "edit" }) {
	const { openDialog, openDrawer } = useModalStack();

	const form = useForm<z.infer<typeof tagFormSchema>>({
		resolver: zodResolver(tagFormSchema),
		defaultValues: {
			name: '',
			slug: '',
			description: '',
			color: '#000000',
		},
	})

	return (
		//     <div className="flex gap-2">
		//       <button
		//         onClick={() =>
		//           openDialog({
		//             title: "Dialog 標題",
		//             content: ({ close }) => (
		//               <div className="space-y-3">
		//                 <p>這是對話框內容</p>
		//                 <button onClick={close}>關閉</button>
		//               </div>
		//             ),
		//           })
		//         }
		//       >
		//         開啟 Dialog
		//       </button>

		//       <button
		//         onClick={() =>
		//           openDrawer({
		//             title: "Drawer 標題",
		//             content: ({ close }) => (
		//               <div className="space-y-3">
		//                 <p>這是 Drawer 內容</p>
		//                 <button onClick={close}>關閉</button>
		//               </div>
		//             ),
		//           })
		//         }
		//       >
		//         開啟 Drawer
		//       </button>
		//     </div>
		//   );
		<Button onClick={() => openDialog({
			title: modeConfig[mode].title,
			description: modeConfig[mode].description,
			content: ({ close }) => (
				<form
					// onSubmit={form.handleSubmit(onSubmit)} 
					className="space-y-4">
					<FieldGroup className="space-y-4">
						<Field data-invalid={!!form.formState.errors.name}>
							<FieldLabel>名稱</FieldLabel>
							<Input
								{...form.register('name')}
								placeholder="例如：Next.js"
								aria-invalid={!!form.formState.errors.name}
							/>
							<FieldError errors={[form.formState.errors.name]} />
						</Field>

						<Field data-invalid={!!form.formState.errors.slug}>
							<FieldLabel>網址別名 (Slug)</FieldLabel>
							<Input
								{...form.register('slug')}
								placeholder="例如：next-js"
								aria-invalid={!!form.formState.errors.slug}
							/>
							<FieldError errors={[form.formState.errors.slug]} />
						</Field>

						<Field data-invalid={!!form.formState.errors.description}>
							<FieldLabel>描述</FieldLabel>
							<Textarea
								{...form.register('description')}
								placeholder="關於這個標籤的簡短描述..."
								aria-invalid={!!form.formState.errors.description}
							/>
							<FieldError errors={[form.formState.errors.description]} />
						</Field>

						<Field data-invalid={!!form.formState.errors.color}>
							<FieldLabel>顏色</FieldLabel>
							<Input
								{...form.register('color')}
								type="color"
								aria-invalid={!!form.formState.errors.color}
							/>
							<FieldError errors={[form.formState.errors.color]} />
						</Field>
					</FieldGroup>

					<DialogFooter>
						<Button
							type="button"
							variant="secondary"
						//   onClick={() => handleOpenChange(false)}
						>
							取消
						</Button>
						<Button type="submit"
						// disabled={isSubmitting}
						>
							{/* {isSubmitting ? submittingButtonText : submitButtonText} */}

							123
						</Button>
					</DialogFooter>
				</form>
			),
		})}>
			<PlusIcon className="mr-2 h-4 w-4" />
			新增標籤
		</Button>
	);
}

export { TagFormDialog }