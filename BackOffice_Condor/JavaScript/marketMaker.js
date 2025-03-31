$(document).ready(function () {
  $(".marketMaker").trigger("click");
  $(".marketMaker a i").addClass("far fa-hand-point-left");
  $(".marketMaker a").css("font-weight", "bold");
  $(".marketMaker a").css("color", "#FFEA2F");

  let table = $("#marketMakerTable");
  let infoStatus = $("#infoStatus");
  let data = [];
  let modalImageApertura = $("#modalImageContentApertura");
  modalImageApertura.hide();
  infoStatus.hide();
  table.hide();

  function calcularNumeroElementosPorPagina() {
    let alturaTabla = $(window).height() * 0.7;
    let resolucionPantalla = window.screen.width;
    return resolucionPantalla >= 2560 || resolucionPantalla <= 1920
      ? Math.floor(alturaTabla / 25)
      : 25;
  }

  $("#load-date").click(() => {
    modalFormDate.dialog("open");
  });

  const modalFormDate = $("#formDate").dialog({
    title: "Reportes de Market Maker",
    autoOpen: false,
    height: "auto",
    width: 400,
    buttons: {
      CARGAR: async function () {
        const buttonPane = $(this).parent().find(".ui-dialog-buttonpane");
        buttonPane.css("display", "flex");
        buttonPane.css("justify-content", "flex-end");
        buttonPane.find("#infoStatus").remove(); // Eliminar cualquier spinner existente

        let fechaReport = $("#dateReport").val();
        // eliminar los separadores y devolver los datos unidos YYYYMMDD
        let fechaReportFormato = fechaReport.replace(/-/g, "");
        console.log(fechaReportFormato);
        table.show();

        if ($.fn.DataTable.isDataTable("#marketMakerTable")) {
          table.DataTable().destroy();
          table.empty();
        }

        let loadingData = infoStatus.html(`
          <i class="fas fa-spinner fa-spin" style="font-size: 14px;"></i>
          <p style="font-size: 14px;">Cargando datos...</p>
        `);
        infoStatus.show();
        buttonPane.prepend(loadingData);

        try {
          // Validar que la fecha no esté vacía
          if (!fechaReport || fechaReport.trim() === "") {
            if (!$("#formValidate input[name='date']").valid()) {
              table.hide();
              return;
            }
          }

          let responseData;
          try {
            responseData = await getMarketMakerData(fechaReportFormato);
            data = responseData;
          } catch (error) {
            if (error.status === 500) {
              infoStatus.html(
                `<i class="fas fa-exclamation-circle" style="color: orange; font-size: 14px;"></i>
                <p style="font-size: 14px; color: orange;">Sin Datos</p>`
              );
              infoStatus.show();
              buttonPane.prepend(infoStatus);
              table.hide();
              return;
            } else if (error.message.includes("Failed to fetch")) {
              infoStatus.html(
                `<i class="fas fa-exclamation-triangle" style="color: red; font-size: 14px;"></i>
                  <p style="font-size: 14px; color: red;">Servidor no disponible</p>`
              );
              infoStatus.show();
              buttonPane.prepend(infoStatus);
              table.hide();
              return;
            }
          }
          $("#load-date").hide();
          table.DataTable({
            destroy: true,
            autoWidth: true,
            pageLength: calcularNumeroElementosPorPagina(),
            scrollCollapse: true,
            paging: true,
            scrollY: "75vh",
            scrollX: true,
            dom: "Bfrtip",
            data: data,
            buttons: [
              {
                extend: "excelHtml5",
                text: "Excel",
                // Exportar solo las columnas desde la 4 hasta la 9
                exportOptions: {
                  columns: [4, 5, 6, 7, 8, 9],
                },
              },
              {
                text: "Cargar Reporte",
                action: function (e, dt, node, config) {
                  $("#formDateLoad").dialog("open");
                },
              },
            ],
            columnDefs: [
              {
                targets: [0, 1, 2, 3],
                orderable: false,
                className: "dt-body-center",
                width: "1%",
              },
              {
                targets: [6, 8],
                // quiero hacer que los segundos se formatene en nuemeros enteros y con un . en los separadores de miles
                render: $.fn.dataTable.render.number(".", ",", 0),
                className: "dt-body-right",
              },
              {
                targets: [7, 9],
                // Convertir los numero de apetura y regular a porcentaje
                render: function (data, type, row) {
                  return `${(data * 100).toLocaleString("es-ES", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}%`;
                },
                className: "dt-body-right",
              },
              {
                targets: [4],
                render: function (data, type, row) {
                  return data.split("-").reverse().join("/");
                },
              },
            ],
            columns: [
              {
                title: "AP",
                defaultContent: `<button id="Ap_imagen" class="ui-button ui-widget ui-corner-all" style='width: 24px; height: 24px; padding: 0;'>
                      <i class="far fa-image"></i>
                    </button>`,
              },
              {
                title: "RT",
                defaultContent: `<button id="Rt_imagen" class="ui-button ui-widget ui-corner-all" style='width: 24px; height: 24px; padding: 0;'>
                <i class="far fa-image"></i>
              </button>`,
              },
              {
                title: "AP",
                defaultContent: `<button class="ui-button ui-widget ui-corner-all" style='width: 24px; height: 24px; padding: 0;'><a id="excel_apertura_link">
                  <i class="far fa-file-excel" style="color: black;"></i>
                </a></button>`,
              },
              {
                title: "RT",
                defaultContent: `<button class="ui-button ui-widget ui-corner-all" style='width: 24px; height: 24px; padding: 0;'><a id="excel_regular_link">
                  <i class="far fa-file-excel" style="color: black;"></i>
                </a></button>`,
              },
              { data: "fecha", title: "Fecha" },
              { data: "symbol", title: "Símbolo" },
              { data: "segundos_apertura", title: "Seg. Apertura" },
              { data: "porcentaje_apertura", title: "Porcentaje Apertura" },
              { data: "segundos_regular", title: "Seg. Regular" },
              { data: "porcentaje_regular", title: "Porcentaje Regular" },
            ],
          });
          // quieor llamar al dialog y mostrar la imagen de la apertura
          $("#marketMakerTable tbody").on("click", "#Ap_imagen", function () {
            let rowData = table.DataTable().row($(this).parents("tr")).data();
            $("#modalImageContentApertura").html(
              `
               <span style="display: flex; justify-content: center">
                  <img src="${rowData.img_apertura_precio}" alt="Imagen Apertura Precios" style="width: 50%;">
                  <img src="${rowData.img_apertura_spread}" alt="Imagen Apertura Spread" style="width: 50%;">
               </span>
              `
            );
            $("#modalImageContentApertura").dialog("open");
          });

          $("#marketMakerTable tbody").on("click", "#Rt_imagen", function () {
            console.log("Click en RT_imagen");
            let rowData = table.DataTable().row($(this).parents("tr")).data();
            $("#modalImageContentRegular").html(
              `
             <span style="display: flex; justify-content: center">
                <img src="${rowData.img_regular_precios}" alt="Imagen Regular Precios" style="width: 50%;">
                <img src="${rowData.img_regular_spread}" alt="Imagen Regular Spread" style="width: 50%;">
             </span>
            `
            );
            $("#modalImageContentRegular").dialog("open");
          });

          // quiero crear un dowload para el excel de la apertura y el regular
          $("#marketMakerTable tbody").on(
            "click",
            "#excel_apertura_link",
            function () {
              let rowData = table.DataTable().row($(this).parents("tr")).data();
              window.open(rowData.excel_apertura);
            }
          );

          $("#marketMakerTable tbody").on(
            "click",
            "#excel_regular_link",
            function () {
              let rowData = table.DataTable().row($(this).parents("tr")).data();
              window.open(rowData.excel_regular);
            }
          );

          // Implementar ResizeObserver para ajustar las columnas cuando cambia el tamaño
          const divElem = document.querySelector(".contenido");
          new ResizeObserver(function () {
            try {
              if (table && $.fn.DataTable.isDataTable("#marketMakerTable")) {
                table.DataTable().columns.adjust().draw(false);
              }
            } catch (ex) {
              console.error("Error ajustando columnas:", ex);
            }
          }).observe(divElem);
        } catch (error) {
          console.error(`Error: ${error}`);
        }

        $(this).dialog("close");
      },
    },
    close: () => {
      infoStatus.hide();
      $("#dateReport").val("");
    },
  });

  // quiero construir un modal para que muestre la imagen de la apertura
  $("#modalImageContentApertura").dialog({
    title: "Imagen Apertura",
    autoOpen: false,
    width: window.screen.width * 0.7,
    modal: true,
    buttons: {
      CERRAR: function () {
        $(this).dialog("close");
      },
    },
  });

  $("#modalImageContentRegular").dialog({
    title: "Imagen Regular",
    autoOpen: false,
    width: window.screen.width * 0.7,
    modal: true,
    buttons: {
      CERRAR: function () {
        $(this).dialog("close");
      },
    },
  });

  $("#formDateLoad").dialog({
    title: "Cargar Reporte de Market Maker",
    autoOpen: false,
    height: "auto",
    width: 400,
    buttons: {
      CARGAR: async function () {
        // metodos para manipular el panel de botones del dialog
        const buttonPane = $(this).parent().find(".ui-dialog-buttonpane");
        buttonPane.css("display", "flex");
        buttonPane.css("justify-content", "flex-end");
        buttonPane.find("#infoStatus").remove();

        // obtener la fecha del input
        let fechaReport = $("#dateReportLoad").val();
        let fechaReportFormato = fechaReport.replace(/-/g, "");
        // ejecutar la funcion para obtener los datos de la API
        let loadingData = infoStatus.html(`
          <i class="fas fa-spinner fa-spin" style="font-size: 14px;"></i>
          <p style="font-size: 14px;">Cargando datos...</p>
        `);
        infoStatus.show();
        buttonPane.prepend(loadingData);

        let responseData;
        try {
          responseData = await getMarketMakerData(fechaReportFormato);
          data = responseData;
        } catch (error) {
          if (error.status === 500) {
            infoStatus.html(
              `<i class="fas fa-exclamation-circle" style="color: orange; font-size: 14px;"></i>
              <p style="font-size: 14px; color: orange;">Sin Datos</p>`
            );
            infoStatus.show();
            buttonPane.prepend(infoStatus);
            return;
          } else if (error.message.includes("Failed to fetch")) {
            infoStatus.html(
              `<i class="fas fa-exclamation-triangle" style="color: red; font-size: 14px;"></i>
              <p style="font-size: 14px; color: red;">Servidor no disponible</p>`
            );
            infoStatus.show();
            buttonPane.prepend(infoStatus);
            return;
          }
        }

        // metodo para actualizar el datatable
        table.DataTable().destroy();
        table.empty();
        table.DataTable({
          destroy: true,
          autoWidth: true,
          pageLength: calcularNumeroElementosPorPagina(),
          scrollCollapse: true,
          scrollX: true,
          scrollY: "75vh",
          dom: "Bfrtip",
          data: data,
          buttons: [
            {
              extend: "excelHtml5",
              text: "Excel",
              // Exportar solo las columnas desde la 4 hasta la 9
              exportOptions: {
                columns: [4, 5, 6, 7, 8, 9],
              },
            },
            {
              text: "Cargar Reporte",
              action: function (e, dt, node, config) {
                $("#formDateLoad").dialog("open");
              },
            },
          ],
          columnDefs: [
            {
              targets: [0, 1, 2, 3],
              orderable: false,
              className: "dt-body-center",
              width: "1%",
            },
            {
              targets: [6, 8],
              // quiero hacer que los segundos se formatene en nuemeros enteros y con un . en los separadores de miles
              render: $.fn.dataTable.render.number(".", ",", 0),
              className: "dt-body-right",
            },
            {
              targets: [7, 9],
              // Convertir los numero de apetura y regular a porcentaje
              render: function (data, type, row) {
                return `${(data * 100).toLocaleString("es-ES", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}%`;
              },
              className: "dt-body-right",
            },
            {
              targets: [4],
              render: function (data, type, row) {
                return data.split("-").reverse().join("/");
              },
            },
          ],
          columns: [
            {
              title: "AP",
              defaultContent: `<button id="Ap_imagen" class="ui-button ui-widget ui-corner-all" style='width: 24px; height: 24px; padding: 0;'>
                      <i class="far fa-image"></i>
                    </button>`,
            },
            {
              title: "RT",
              defaultContent: `<button id="Rt_imagen" class="ui-button ui-widget ui-corner-all" style='width: 24px; height: 24px; padding: 0;'>
                <i class="far fa-image"></i>
              </button>`,
            },
            {
              title: "AP",
              defaultContent: `<button class="ui-button ui-widget ui-corner-all" style='width: 24px; height: 24px; padding: 0;'><a id="excel_apertura_link">
                  <i class="far fa-file-excel" style="color: black;"></i>
                </a></button>`,
            },
            {
              title: "RT",
              defaultContent: `<button class="ui-button ui-widget ui-corner-all" style='width: 24px; height: 24px; padding: 0;'><a id="excel_regular_link">
                  <i class="far fa-file-excel" style="color: black;"></i>
                </a></button>`,
            },
            { data: "fecha", title: "Fecha" },
            { data: "symbol", title: "Símbolo" },
            { data: "segundos_apertura", title: "Seg. Apertura" },
            { data: "porcentaje_apertura", title: "Porcentaje Apertura" },
            { data: "segundos_regular", title: "Seg. Regular" },
            { data: "porcentaje_regular", title: "Porcentaje Regular" },
          ],
        });
        // quieor llamar al dialog y mostrar la imagen de la apertura
        $("#marketMakerTable tbody").on("click", "#Ap_imagen", function () {
          let rowData = table.DataTable().row($(this).parents("tr")).data();
          $("#modalImageContentApertura").html(
            `
               <span style="display: flex; justify-content: center">
                  <img src="${rowData.img_apertura_precio}" alt="Imagen Apertura" style="width: 50%;">
                  <img src="${rowData.img_apertura_spread}" alt="Imagen Apertura" style="width: 50%;">
               </span>
              `
          );
          $("#modalImageContentApertura").dialog("open");
        });

        $("#marketMakerTable tbody").on("click", "#Rt_imagen", function () {
          console.log("Click en RT_imagen");
          let rowData = table.DataTable().row($(this).parents("tr")).data();
          $("#modalImageContentRegular").html(
            `
             <span style="display: flex; justify-content: center">
                <img src="${rowData.img_regular_precios}" alt="" style="width: 50%;">
                <img src="${rowData.img_regular_spread}" alt="" style="width: 50%;">
             </span>
            `
          );
          $("#modalImageContentRegular").dialog("open");
        });

        // quiero crear un dowload para el excel de la apertura y el regular
        $("#marketMakerTable tbody").on(
          "click",
          "#excel_apertura_link",
          function () {
            let rowData = table.DataTable().row($(this).parents("tr")).data();
            window.open(rowData.excel_apertura);
          }
        );

        $("#marketMakerTable tbody").on(
          "click",
          "#excel_regular_link",
          function () {
            let rowData = table.DataTable().row($(this).parents("tr")).data();
            window.open(rowData.excel_regular);
          }
        );

        // Implementar ResizeObserver para ajustar las columnas cuando cambia el tamaño
        const divElem = document.querySelector(".contenido");
        new ResizeObserver(function () {
          try {
            if (table && $.fn.DataTable.isDataTable("#marketMakerTable")) {
              table.DataTable().columns.adjust().draw(false);
            }
          } catch (ex) {
            console.error("Error ajustando columnas:", ex);
          }
        }).observe(divElem);

        $(this).dialog("close");
      },
    },
    close: () => {
      infoStatus.hide();
      $("#dateReportLoad").val("");
    },
  });

  // Promesa para obtener los datso de la API
  async function getMarketMakerData(
    fechaReportFormato,
    baseUrl = "http://127.0.0.1:8000"
  ) {
    try {
      const response = await fetch(
        `${baseUrl}/reporte?fecha=${fechaReportFormato}`
      );

      if (!response.ok) {
        const errorData = {
          status: response.status,
          message: response.statusText,
        };
        throw errorData;
      }

      const jsonData = await response.json();
      console.log(jsonData);
      if (!jsonData?.report?.length) {
        throw new Error("No data available");
      }

      return jsonData.report.map((item) => ({
        symbol: item.symbol,
        fecha: item.fecha,
        segundos_apertura: item.data["Segundos Pantalla Apertura"] ?? null,
        porcentaje_apertura: item.data["% Apertura"] ?? null,
        segundos_regular:
          item.data["Segundos Pantalla Regular Trading"] ?? null,
        porcentaje_regular: item.data["% Regular Trading"] ?? null,
        img_apertura_precio: item.img_apertura_precio,
        img_apertura_spread: item.img_apertura_spread,
        img_regular_spread: item.img_regular_spread,
        img_regular_precios: item.img_regular_precios,
        excel_apertura: item.excel_apertura,
        excel_regular: item.excel_regular,
      }));
    } catch (error) {
      console.error("Error fetching market maker data:", error);
      throw error;
    }
  }

  $("#formValidate").validate({
    rules: {
      dateReport: {
        required: true,
        minlength: 1,
      },
      messages: {
        dateReport: {
          required: "Fecha requerida",
        },
      },
    },
    errorPlacement: function (error, elemenet) {
      const errorMessage = error.text();
      elemenet.attr("data-placeholder", elemenet.attr("placeholder"));
      elemenet.attr("placeholder", errorMessage);
    },
    highlight: function (element) {
      $(element).css("border-color", "red");
    },
    unhighlight: function (element) {
      $(element).css("border-color", "");
      $(element).attr("placeholder", $(element).attr("data-placeholder"));
    },
  });
});
