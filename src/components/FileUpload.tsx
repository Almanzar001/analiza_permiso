import { useRef, useState } from 'react'

interface FileUploadProps {
  onFileSelect: (files: File[]) => void
  isAnalyzing: boolean
}

const FileUpload = ({ onFileSelect, isAnalyzing }: FileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const validateFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    const maxSize = 10 * 1024 * 1024 // 10MB

    if (!validTypes.includes(file.type)) {
      alert(`Archivo "${file.name}" tiene formato no válido. Use JPG, PNG, WEBP o PDF.`)
      return false
    }

    if (file.size > maxSize) {
      alert(`Archivo "${file.name}" es demasiado grande. Máximo 10MB.`)
      return false
    }

    return true
  }

  const handleFileSelect = (file: File) => {
    if (validateFile(file)) {
      onFileSelect([file])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${isAnalyzing ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleInputChange}
          className="hidden"
          disabled={isAnalyzing}
        />

        {isAnalyzing ? (
          <div className="space-y-4">
            <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-lg text-gray-600">Analizando documento...</p>
            <p className="text-sm text-gray-500">
              Esto puede tomar unos minutos dependiendo del tamaño del archivo
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Suba su permiso ambiental
              </h3>
              <p className="text-gray-600 mb-4">
                Arrastre y suelte el archivo aquí o haga clic para seleccionar
              </p>
            </div>

            <button
              onClick={openFileDialog}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Seleccionar Archivo
            </button>

            <div className="text-sm text-gray-500 space-y-1">
              <p>Formatos soportados: JPG, PNG, WEBP, PDF</p>
              <p>Tamaño máximo: 10MB</p>
            </div>
          </div>
        )}
      </div>

      {!isAnalyzing && (
        <div className="mt-8 bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center mb-3">
            <h4 className="font-semibold text-gray-800 mr-2">
              ¿Qué información extraeremos?
            </h4>
            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
              🇩🇴 República Dominicana
            </span>
          </div>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Coordenadas UTM y ubicación geográfica (Zonas 19N/20N)
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Centro del polígono del área autorizada
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Fecha de emisión y vencimiento
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Días autorizados ("VÁLIDO POR X DÍAS")
            </li>
          </ul>
          <div className="mt-3 p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">
              💡 <strong>Optimizado para permisos del Ministerio de Medio Ambiente y Recursos Naturales (MARENA) de República Dominicana</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default FileUpload