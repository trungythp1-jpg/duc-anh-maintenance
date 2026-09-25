const { db, now } = require('../lib/admin');
const { normalizeText } = require('../lib/utils');
const { generateElevatorCode } = require('../codes/elevator-code');
const { findCustomerDuplicates } = require('../duplicate/customer');
const { validateCustomer } = require('../validation/customer');
const { validateBuilding } = require('../validation/building');
const { validateElevator } = require('../validation/elevator');
const { historyEntry, appendHistory } = require('./history');

function cleanString(value) {
  return String(value ?? '').trim();
}

function addressToText(address) {
  if (typeof address === 'string') return cleanString(address);
  if (!address || typeof address !== 'object') return '';

  return [
    address.detail,
    address.street,
    address.ward,
    address.district,
    address.province
  ]
    .map(cleanString)
    .filter(Boolean)
    .join(', ');
}

function locationToLatLng(location) {
  if (!location) return { latitude: undefined, longitude: undefined };

  const latitude = Number(location.lat);
  const longitude = Number(location.lng);

  return {
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined
  };
}

function buildCustomerData(request) {
  const source = request.externalCustomer || {};

  /*
   * Current Customer validator expects address to be a string.
   * CSKH may submit either a plain string or an address object, so normalize
   * both forms before passing data into the existing validator.
   */
  return validateCustomer({
    name: source.name,
    phone: source.phone,
    email: source.email || '',
    type: source.type || 'business',
    taxCode: source.taxCode || '',
    address: addressToText(source.address),
    contactPerson: source.contactPerson || { name: '', phone: '' },
    status: 'active'
  });
}

function buildBuildingData(request, customerId) {
  const source = request.externalBuilding || {};

  const address = {
    province: cleanString(source.address?.province),
    district: cleanString(source.address?.district),
    detail: cleanString(source.address?.detail || source.address)
  };

  const location = source.location
    ? {
        lat: Number(source.location.lat),
        lng: Number(source.location.lng),
        accuracy: Number.isFinite(Number(source.location.accuracy))
          ? Number(source.location.accuracy)
          : null,
        source: cleanString(source.location.source) || 'cskh'
      }
    : null;

  const { latitude, longitude } = locationToLatLng(location);

  // Reuse the existing Building validator on its current Function schema.
  const validated = validateBuilding({
    customerId,
    name: source.name,
    address: addressToText(address),
    latitude,
    longitude
  });

  return {
    name: validated.name,
    customerId: validated.customerId,
    address,
    location,
    type: cleanString(source.type) || 'other',
    manager: {
      name: cleanString(source.manager?.name),
      phone: cleanString(source.manager?.phone)
    },
    status: 'active',
    duplicateCheckData: {
      customerId,
      name: validated.name,
      address: validated.address,
      latitude,
      longitude
    }
  };
}

function buildElevatorData(request, buildingId, customerId) {
  const source = request.externalElevator || {};
  const technical = source.technical || {};

  const validated = validateElevator({
    buildingId,
    customerId,
    name: source.name,
    serialNumber: source.serialNumber || '',
    manufacturer: source.manufacturer || '',
    machineBrand: technical.machine?.brand || source.machineBrand || '',
    machineModel: technical.machine?.model || source.machineModel || '',
    controllerBrand:
      technical.controller?.brand || source.controllerBrand || '',
    controllerModel:
      technical.controller?.model || source.controllerModel || '',
    status: 'ACTIVE',
    serviceStatus: 'NOT_MANAGED'
  });

  return {
    name: validated.name,
    buildingId,
    customerId,
    assetCode: '',
    status: 'active',
    technical: {
      capacityKg: technical.capacityKg ?? null,
      speed: technical.speed ?? null,
      stops: technical.stops ?? null,
      machine: {
        brand: validated.machineBrand || '',
        model: validated.machineModel || ''
      },
      controller: {
        brand: validated.controllerBrand || '',
        model: validated.controllerModel || ''
      },
      installationYear: technical.installationYear ?? null
    },
    service: {
      maintenanceStatus: 'active'
    },
    serialNumber: validated.serialNumber || '',
    serialNumberNormalized: validated.serialNumberNormalized || '',
    existingCode: cleanString(source.existingCode)
  };
}


function buildContractData(request, customerId, buildingId, elevatorId) {
  const source = request.externalContract || {};
  const durationMonths = Number(source.durationMonths || 0);
  const startDate = cleanString(source.startDate);
  const endDate = (() => {
    if (!startDate || ![12, 24, 36].includes(durationMonths)) return '';
    const d = new Date(`${startDate}T00:00:00`);
    d.setMonth(d.getMonth() + durationMonths);
    return d.toISOString().slice(0, 10);
  })();

  if (!cleanString(source.code)) throw new Error('Mã hợp đồng là bắt buộc.');
  if (!cleanString(source.name)) throw new Error('Tên hợp đồng là bắt buộc.');
  if (!startDate) throw new Error('Ngày hiệu lực hợp đồng là bắt buộc.');
  if (![12, 24, 36].includes(durationMonths)) {
    throw new Error('Thời hạn hợp đồng phải là 12, 24 hoặc 36 tháng.');
  }

  return {
    code: cleanString(source.code),
    name: cleanString(source.name),
    customerId,
    buildingId,
    elevatorId,
    status: cleanString(source.status) || 'active',
    signedDate: cleanString(source.signedDate) || new Date().toISOString().slice(0, 10),
    startDate,
    endDate,
    contractValue: Number(source.contractValue || 0),
    warrantyEnabled: source.warrantyEnabled || 'yes',
    warrantyPeriod: cleanString(source.warrantyPeriod),
    warrantyStart: cleanString(source.warrantyStart) || startDate,
    warrantyEnd: cleanString(source.warrantyEnd) || endDate,
    warrantyNote: cleanString(source.warrantyNote),
    maintenanceEnabled: source.maintenanceEnabled || 'yes',
    maintenanceType: source.maintenanceType || 'paid',
    maintenanceCycle: source.maintenanceCycle || 'monthly',
    maintenanceOwner: cleanString(source.maintenanceOwner),
    paidValue: Number(source.paidValue || 0),
    paymentDue: cleanString(source.paymentDue),
    note: cleanString(source.note)
  };
}

async function verifyExistingChain(request) {
  const customerId = cleanString(request.customerId);
  const buildingId = cleanString(request.buildingId);
  const elevatorId = cleanString(request.elevatorId);

  if (!customerId || !buildingId || !elevatorId) {
    throw new Error(
      'Yêu cầu EXISTING_CUSTOMER phải có customerId, buildingId và elevatorId.'
    );
  }

  const [customerSnap, buildingSnap, elevatorSnap] = await Promise.all([
    db.collection('customers').doc(customerId).get(),
    db.collection('buildings').doc(buildingId).get(),
    db.collection('elevators').doc(elevatorId).get()
  ]);

  if (!customerSnap.exists) throw new Error('Không tìm thấy khách hàng.');
  if (!buildingSnap.exists) throw new Error('Không tìm thấy tòa nhà.');
  if (!elevatorSnap.exists) throw new Error('Không tìm thấy thang máy.');

  const customer = { id: customerSnap.id, ...customerSnap.data() };
  const building = { id: buildingSnap.id, ...buildingSnap.data() };
  const elevator = { id: elevatorSnap.id, ...elevatorSnap.data() };

  if (String(building.customerId) !== String(customer.id)) {
    throw new Error('Tòa nhà không thuộc khách hàng đã chọn.');
  }

  if (String(elevator.buildingId) !== String(building.id)) {
    throw new Error('Thang máy không thuộc tòa nhà đã chọn.');
  }

  return { customer, building, elevator };
}

async function approveExternalRequest(request) {
  const customerData = buildCustomerData(request);
  const customerDuplicates = await findCustomerDuplicates(customerData);

  const customerBlocks = customerDuplicates.filter(
    x => x.severity === 'BLOCK'
  );

  if (customerBlocks.length) {
    return {
      ok: false,
      status: 'DUPLICATE',
      duplicateStage: 'CUSTOMER',
      duplicates: customerDuplicates
    };
  }

  /*
   * The existing Building duplicate helper requires customerId.
   * The existing Elevator duplicate helper requires buildingId.
   *
   * For a genuinely new external customer, those official IDs do not exist
   * until this transaction creates them. We therefore do not create a second
   * duplicate algorithm here.
   *
   * Customer BLOCK is the authoritative preflight that can be evaluated
   * before master IDs exist. WARN results are retained for Admin/audit.
   */
  const buildingData = buildBuildingData(request, '__CUSTOMER_ID__');

  const elevatorData = buildElevatorData(
    request,
    '__BUILDING_ID__',
    '__CUSTOMER_ID__'
  );

  return {
    ok: true,
    customerData,
    customerDuplicates,
    buildingData,
    elevatorData
  };
}

async function createExternalMasterData(request, options = {}) {
  const preflight = await approveExternalRequest(request);

  if (!preflight.ok) return preflight;

  const customerData = preflight.customerData;
  const requestRef = options.requestRef || null;
  const admin = options.admin || null;

  /*
   * The approval flow has already atomically claimed the request as
   * ADMIN_REVIEW. This transaction re-checks that state before creating
   * master data, so the request and the three master records are committed
   * together.
   */
  const result = await db.runTransaction(async transaction => {
    // ALL transaction reads must happen before any transaction writes.
    const requestSnapshot = requestRef
      ? await transaction.get(requestRef)
      : null;

    if (requestSnapshot && !requestSnapshot.exists) {
      throw new Error('Phiếu CSKH không còn tồn tại.');
    }

    if (
      requestSnapshot &&
      String(requestSnapshot.data()?.status || '') !== 'ADMIN_REVIEW'
    ) {
      throw new Error(
        'Phiếu CSKH đã được xử lý hoặc không còn ở trạng thái duyệt.'
      );
    }

    // generateElevatorCode() performs its own transaction.get().
    // It is therefore intentionally called before any transaction.set().
    const code = await generateElevatorCode(transaction);

    const customerRef = db.collection('customers').doc();
    const buildingRef = db.collection('buildings').doc();
    const elevatorRef = db.collection('elevators').doc();

    const customer = {
      name: customerData.name,
      nameNormalized: customerData.nameNormalized,
      type: customerData.type || 'business',
      phone: customerData.phone || '',
      email: customerData.email || '',
      taxCode: customerData.taxCode || '',
      address: customerData.address || '',
      contactPerson: customerData.contactPerson || {
        name: '',
        phone: ''
      },
      status: 'active',
      createdAt: now(),
      updatedAt: now()
    };

    const buildingData = buildBuildingData(request, customerRef.id);

    const elevatorData = buildElevatorData(
      request,
      buildingRef.id,
      customerRef.id
    );

    elevatorData.assetCode = code.displayCode;

    transaction.set(customerRef, customer);

    transaction.set(buildingRef, {
      name: buildingData.name,
      nameNormalized: normalizeText(buildingData.name),
      customerId: customerRef.id,
      address: buildingData.address,
      addressNormalized: normalizeText(
        buildingData.duplicateCheckData.address
      ),
      location: buildingData.location,
      type: buildingData.type,
      manager: buildingData.manager,
      status: buildingData.status,
      createdAt: now(),
      updatedAt: now()
    });

    transaction.set(elevatorRef, {
      ...elevatorData,
      elevatorCode: code.elevatorCode,
      codeSequence: code.sequence,
      displayCode: code.displayCode,
      createdAt: now(),
      updatedAt: now()
    });

    let contractRef = null;
    let contractData = null;

    if (String(request.requestType || '') === 'CONTRACT_REQUEST') {
      contractRef = db.collection('contracts').doc();
      contractData = buildContractData(
        request,
        customerRef.id,
        buildingRef.id,
        elevatorRef.id
      );

      transaction.set(contractRef, {
        ...contractData,
        customerName: customerData.name || '',
        buildingName: buildingData.name || '',
        elevatorName: elevatorData.name || '',
        createdAt: now(),
        updatedAt: now()
      });
    }

    if (requestRef && requestSnapshot) {
      const current = requestSnapshot.data() || {};

      const nextHistory = appendHistory(
        current,
        historyEntry({
          action: 'CREATED',
          byUid: admin?.uid || '',
          byName: admin?.name || '',
          fromStatus: 'ADMIN_REVIEW',
          toStatus: 'CREATED',
          metadata: {
            customerId: customerRef.id,
            buildingId: buildingRef.id,
            elevatorId: elevatorRef.id,
            contractId: contractRef?.id || '',
            displayCode: code.displayCode
          }
        })
      );

      transaction.update(requestRef, {
        status: 'CREATED',
        customerId: customerRef.id,
        buildingId: buildingRef.id,
        elevatorId: elevatorRef.id,
        contractId: contractRef?.id || '',
        processedAt: now(),
        resultNote: contractRef
          ? 'Đã tạo Customer → Building → Elevator → Contract.'
          : 'Đã tạo Customer → Building → Elevator.',
        duplicateResults: preflight.customerDuplicates.filter(
          x => x.severity === 'WARN'
        ),
        updatedAt: now(),
        history: nextHistory
      });
    }

    return {
      customerId: customerRef.id,
      buildingId: buildingRef.id,
      elevatorId: elevatorRef.id,
      contractId: contractRef?.id || '',
      elevatorCode: code.elevatorCode,
      displayCode: code.displayCode
    };
  });

  return {
    ok: true,
    ...result,
    warnings: preflight.customerDuplicates.filter(
      x => x.severity === 'WARN'
    )
  };
}

module.exports = {
  verifyExistingChain,
  buildCustomerData,
  buildBuildingData,
  buildElevatorData,
  approveExternalRequest,
  createExternalMasterData
};
